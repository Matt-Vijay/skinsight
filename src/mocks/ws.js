// Mock implementation for ws module
class WebSocket {
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = WebSocket.CONNECTING;
    this.CONNECTING = WebSocket.CONNECTING;
    this.OPEN = WebSocket.OPEN;
    this.CLOSING = WebSocket.CLOSING;
    this.CLOSED = WebSocket.CLOSED;
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen();
      }
    }, 100);
  }

  // WebSocket states
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  send(data) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Simulate successful send
    return true;
  }

  close(code, reason) {
    if (this.readyState === WebSocket.CLOSED) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    // Simulate closing
    setTimeout(() => {
      this.readyState = WebSocket.CLOSED;
      if (this.onclose) {
        this.onclose({ code, reason, wasClean: true });
      }
    }, 100);
  }

  // Event handlers
  onopen = null;
  onclose = null;
  onerror = null;
  onmessage = null;
}

// Mock WebSocket server
class WebSocketServer {
  constructor(options) {
    this.options = options || {};
    this.clients = new Set();
  }

  on(event, callback) {
    this[`on${event}`] = callback;
    return this;
  }

  handleUpgrade(request, socket, head, callback) {
    const ws = new WebSocket('ws://localhost');
    callback(ws);
  }

  close(callback) {
    if (callback) {
      callback();
    }
  }
}

// Export mock
module.exports = {
  WebSocket,
  Server: WebSocketServer
}; 