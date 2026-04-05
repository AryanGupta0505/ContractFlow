const { EventEmitter } = require("events");

function getNotificationEmitter() {
  if (!globalThis.__contractNotificationEmitter) {
    globalThis.__contractNotificationEmitter = new EventEmitter();
    globalThis.__contractNotificationEmitter.setMaxListeners(200);
  }

  return globalThis.__contractNotificationEmitter;
}

function publishNotificationEvent(event) {
  getNotificationEmitter().emit("notifications:event", event);
}

function subscribeNotificationEvents(listener) {
  const emitter = getNotificationEmitter();
  emitter.on("notifications:event", listener);

  return () => {
    emitter.off("notifications:event", listener);
  };
}

module.exports = {
  publishNotificationEvent,
  subscribeNotificationEvents,
};
