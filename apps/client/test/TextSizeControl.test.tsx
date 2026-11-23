// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { TextSizeControl } from "../src/ui/TextSizeControl";

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.style.removeProperty("--text-scale");
});

const scale = () => document.documentElement.style.getPropertyValue("--text-scale");

it("steps the text scale up and down within its range and remembers it", async () => {
  render(<TextSizeControl />);
  await userEvent.click(screen.getByRole("button", { name: "Larger text" }));
  expect(scale()).toBe("1.25");
  for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole("button", { name: "Larger text" }));
  expect(scale()).toBe("2");
  expect(localStorage.getItem("textScale")).toBe("2");
  for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole("button", { name: "Smaller text" }));
  expect(scale()).toBe("1");
});

it("starts from the size remembered last time", () => {
  localStorage.setItem("textScale", "1.5");
  render(<TextSizeControl />);
  expect(scale()).toBe("1.5");
});

it("ignores a remembered value that is not one of its steps", () => {
  localStorage.setItem("textScale", "9000");
  render(<TextSizeControl />);
  expect(scale()).toBe("1");
});
