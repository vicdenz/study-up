// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import AITutor from "./AITutor";

const mocks = vi.hoisted(() => ({
  clearMessages: vi.fn(),
  loadChat: vi.fn(),
  navigate: vi.fn(),
  saveChat: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock("@/components/Navigation", () => ({ default: () => <nav>Navigation</nav> }));
vi.mock("@/components/UserMenu", () => ({ default: () => <button>User menu</button> }));
vi.mock("@/components/SaveChatDialog", () => ({ default: () => null }));
vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname: "/ai-tutor", state: {
    courseId: "course-1",
    courseName: "Physics",
    assignmentId: "assignment-1",
    assignmentDetails: { title: "Forces", description: "Explain Newton's laws" },
  } }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/hooks/useAssignments", () => ({ useAllAssignments: () => ({ assignments: [] }) }));
vi.mock("@/hooks/useCourseMaterials", () => ({ useCourseMaterials: () => ({ materials: [{ title: "Lecture notes", type: "text/plain", content: "Force equals mass times acceleration", url: null }] }) }));
vi.mock("@/hooks/useAssignmentMaterials", () => ({ useAssignmentMaterials: () => ({ materials: [{ title: "Diagram", type: "image/png", content: null, url: "https://example.com/diagram.png" }] }) }));
vi.mock("@/hooks/useGeminiChat", () => ({
  useGeminiChat: () => ({
    messages: [],
    isLoading: false,
    isSaving: false,
    sendMessage: mocks.sendMessage,
    clearMessages: mocks.clearMessages,
    saveChat: mocks.saveChat,
    loadChat: mocks.loadChat,
  }),
}));

describe("AITutor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendMessage.mockResolvedValue(undefined);
    Element.prototype.scrollIntoView = vi.fn();
  });

  test("explains connected context and keeps empty-state guidance focused", () => {
    render(<AITutor />);
    expect(screen.getByText("What can we work through?")).toBeVisible();
    expect(screen.getByText(/1 course and 1 assignment material/)).toBeVisible();
    expect(screen.getByPlaceholderText("Ask about “Forces”…")).toBeVisible();
  });

  test("submits on Enter with course, assignment, text, and image context", async () => {
    const user = userEvent.setup();
    render(<AITutor />);
    const composer = screen.getByPlaceholderText("Ask about “Forces”…");
    await user.type(composer, "Can you explain this?{enter}");

    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledOnce());
    const [message, context, imageUrls] = mocks.sendMessage.mock.calls[0];
    expect(message).toBe("Can you explain this?");
    expect(context).toContain('course: "Physics"');
    expect(context).toContain('assignment: "Forces"');
    expect(context).toContain("Force equals mass times acceleration");
    expect(context).toContain('image(s) have been provided');
    expect(imageUrls).toEqual(["https://example.com/diagram.png"]);
  });
});
