import type { TaskStatus } from "@/lib/dance/types";

const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  created: ["input_reviewing"],
  input_reviewing: ["rejected", "reserved"],
  rejected: [],
  reserved: ["submitted", "failed_refunded", "blocked_refunded"],
  submitted: ["processing", "failed_refunded"],
  processing: ["transferring", "failed_refunded", "blocked_refunded"],
  transferring: ["output_reviewing", "failed_refunded"],
  output_reviewing: ["succeeded", "blocked_refunded"],
  succeeded: [],
  failed_refunded: [],
  blocked_refunded: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus) {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: TaskStatus, to: TaskStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid dance task transition: ${from} -> ${to}`);
  }
}

export function getNextHappyPathStatus(status: TaskStatus): TaskStatus {
  const happyPath: TaskStatus[] = [
    "created",
    "input_reviewing",
    "reserved",
    "submitted",
    "processing",
    "transferring",
    "output_reviewing",
    "succeeded",
  ];
  const currentIndex = happyPath.indexOf(status);

  if (currentIndex < 0 || currentIndex === happyPath.length - 1) {
    return status;
  }

  return happyPath[currentIndex + 1];
}

export function isTerminalStatus(status: TaskStatus) {
  return ["rejected", "succeeded", "failed_refunded", "blocked_refunded"].includes(status);
}
