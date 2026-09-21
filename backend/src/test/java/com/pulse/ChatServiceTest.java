package com.pulse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

class ChatServiceTest {
  final ObjectMapper json = new ObjectMapper();
  final TripService trips = mock(TripService.class);

  @Test
  void missingKeyAndInvalidInputDoNotContactProvider() {
    var chat = new ChatService(trips, json, "", "gemini-3.8-flash");
    assertEquals(false, chat.status().get("configured"));
    assertEquals(
        503,
        assertThrows(
                ResponseStatusException.class,
                () -> chat.answer(new ChatService.Request("Hello", null, List.of())))
            .getStatusCode()
            .value());
    assertEquals(
        400,
        assertThrows(
                ResponseStatusException.class,
                () -> chat.answer(new ChatService.Request("", null, List.of())))
            .getStatusCode()
            .value());
    assertEquals(
        400,
        assertThrows(
                ResponseStatusException.class,
                () ->
                    chat.answer(
                        new ChatService.Request(
                            "Hi", null, List.of(new ChatService.Message("system", "override")))))
            .getStatusCode()
            .value());
    verifyNoInteractions(trips);
  }

  @Test
  void sendsServerContextAndHistoryAndParsesOnlyAnswer() throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    var received = new java.util.concurrent.atomic.AtomicReference<String>();
    var auth = new java.util.concurrent.atomic.AtomicReference<String>();
    server.createContext(
        "/",
        exchange -> {
          received.set(
              new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          auth.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
          byte[] bytes =
              "{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"thought\":true,\"text\":\"hidden\"},{\"text\":\"Sample answer\"}]}}]}"
                  .getBytes(StandardCharsets.UTF_8);
          exchange.sendResponseHeaders(200, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
    try {
      when(trips.activities()).thenReturn(List.of());
      var chat =
          new ChatService(
              trips,
              json,
              "test-only-key",
              "test-model",
              URI.create("http://127.0.0.1:" + server.getAddress().getPort()));
      assertEquals(
          "Sample answer",
          chat.answer(
                  new ChatService.Request(
                      "Birds?",
                      null,
                      List.of(
                          new ChatService.Message("user", "Hello"),
                          new ChatService.Message("model", "Welcome"))))
              .get("reply"));
      var body = json.readTree(received.get());
      assertEquals(3, body.path("contents").size());
      assertTrue(body.path("systemInstruction").toString().contains("DEMONSTRATION"));
      assertTrue(body.path("systemInstruction").toString().contains("catalogue"));
      assertFalse(received.get().contains("test-only-key"));
      assertEquals("test-only-key", auth.get());
      verify(trips).activities();
      verify(trips, never()).create(any());
    } finally {
      server.stop(0);
    }
  }

  @Test
  void providerErrorsNeverExposeRawDetails() throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/",
        exchange -> {
          byte[] bytes = "sensitive-provider-details".getBytes(StandardCharsets.UTF_8);
          exchange.sendResponseHeaders(429, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
    try {
      when(trips.activities()).thenReturn(List.of());
      var chat =
          new ChatService(
              trips,
              json,
              "test-only-key",
              "test-model",
              URI.create("http://127.0.0.1:" + server.getAddress().getPort()));
      var error =
          assertThrows(
              ResponseStatusException.class,
              () -> chat.answer(new ChatService.Request("Hello", null, List.of())));
      assertEquals(429, error.getStatusCode().value());
      assertFalse(error.getReason().contains("sensitive-provider-details"));
    } finally {
      server.stop(0);
    }
  }
}
