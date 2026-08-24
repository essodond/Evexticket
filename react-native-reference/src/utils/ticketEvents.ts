type TicketChangeListener = () => void;

const listeners = new Set<TicketChangeListener>();

export const notifyTicketsChanged = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (listenerError) {
      console.warn('Un observateur de billets a échoué', listenerError);
    }
  });
};

export const subscribeToTicketChanges = (listener: TicketChangeListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
