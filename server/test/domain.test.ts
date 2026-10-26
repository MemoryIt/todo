import { describe, expect, it } from "bun:test"
import {
  TITLE_MAX_LENGTH,
  validateCompleted,
  validateTitle,
} from "../src/domain"

describe("validateTitle", () => {
  it("accepts a normal title", () => {
    expect(validateTitle("Buy milk")).toEqual({ ok: true, title: "Buy milk" })
  })

  it("trims surrounding whitespace", () => {
    expect(validateTitle("  Buy milk  ")).toEqual({
      ok: true,
      title: "Buy milk",
    })
  })

  it("rejects non-string values", () => {
    for (const value of [undefined, null, 42, true, {}, []]) {
      expect(validateTitle(value)).toEqual({
        ok: false,
        error: "title must be a string",
      })
    }
  })

  it("rejects empty and whitespace-only titles", () => {
    for (const value of ["", "   ", "\n\t"]) {
      expect(validateTitle(value)).toEqual({
        ok: false,
        error: "title must not be empty",
      })
    }
  })

  it("accepts a title at the length limit", () => {
    const title = "a".repeat(TITLE_MAX_LENGTH)

    expect(validateTitle(title)).toEqual({ ok: true, title })
  })

  it("rejects a title over the length limit", () => {
    const title = "a".repeat(TITLE_MAX_LENGTH + 1)

    expect(validateTitle(title)).toEqual({
      ok: false,
      error: `title must be at most ${TITLE_MAX_LENGTH} characters`,
    })
  })

  it("measures length after trimming", () => {
    const title = `  ${"a".repeat(TITLE_MAX_LENGTH)}  `

    expect(validateTitle(title)).toEqual({
      ok: true,
      title: "a".repeat(TITLE_MAX_LENGTH),
    })
  })
})

describe("validateCompleted", () => {
  it("accepts both booleans", () => {
    expect(validateCompleted(true)).toEqual({ ok: true, completed: true })
    expect(validateCompleted(false)).toEqual({ ok: true, completed: false })
  })

  it("rejects non-boolean values", () => {
    for (const value of [undefined, null, 0, 1, "true", {}]) {
      expect(validateCompleted(value)).toEqual({
        ok: false,
        error: "completed must be a boolean",
      })
    }
  })
})
