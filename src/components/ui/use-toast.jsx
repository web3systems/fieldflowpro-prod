// Inspired by react-hot-toast library
import { useState, useEffect } from "react";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 4000;

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastTimers = new Map();

const scheduleRemoval = (toastId, delay) => {
  if (toastTimers.has(toastId)) {
    clearTimeout(toastTimers.get(toastId));
  }
  const timeout = setTimeout(() => {
    toastTimers.delete(toastId);
    dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
  }, delay);
  toastTimers.set(toastId, timeout);
};

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;
      if (toastId === undefined) {
        state.toasts.forEach((toast) => scheduleRemoval(toast.id, 250));
        return { ...state, toasts: state.toasts.map((t) => ({ ...t, open: false })) };
      }
      scheduleRemoval(toastId, 250);
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId ? { ...t, open: false } : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners = [];
let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function toast({ duration = 5000, ...props }) {
  const id = genId();

  const update = (props) =>
    dispatch({ type: actionTypes.UPDATE_TOAST, toast: { ...props, id } });

  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  // Auto-dismiss after `duration` (default 5s) so confirmations never get stuck.
  if (duration > 0) {
    const timer = setTimeout(() => dismiss(), duration);
    toastTimers.set(`auto-${id}`, timer);
  }

  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };