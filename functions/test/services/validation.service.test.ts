import { Validator } from "../../src/utils/validator";
import { ValidationError, UnauthenticatedError } from "../../src/types/errors.types";

describe("Validator", () => {
  describe("validateMakeGuessRequest", () => {
    it.each([
      [{ prediction: "up" }, true],
      [{ prediction: "down" }, true],
      [null, false],
      ["string", false],
      [{}, false],
      [{ prediction: "invalid" }, false]
    ])("should handle make guess reques %p and isValid: %p", (input, isValid) => {
      if (!isValid) {
        expect(() => Validator.validateMakeGuessRequest(input)).toThrow(ValidationError);
      } else {
        expect(() => Validator.validateMakeGuessRequest(input)).not.toThrow();
      }
    });
  });

  describe("validateGetGuessHistoryRequest", () => {
    it.each([
      [null, { lastKey: null }],
      ["string", { lastKey: null }],
      [{ lastKey: "key123" }, { lastKey: "key123" }],
      [{ lastKey: 123 }, { lastKey: null }]
    ])("should handle get guess history request %p and return %p", (input, expected) => {
      const result = Validator.validateGetGuessHistoryRequest(input);
      expect(result).toEqual(expected);
    });
  });

  describe("validateUserId", () => {
    it.each([
      ["user123", true],
      [null, false],
      [123, false],
      ["", false]
    ])("should handle validate user id %p and isValid: %p", (input, isValid) => {
      if (!isValid) {
        expect(() => Validator.validateUserId(input)).toThrow(UnauthenticatedError);
      } else {
        expect(() => Validator.validateUserId(input)).not.toThrow();
      }
    });
  });

  describe("validateAuth", () => {
    it.each([
      [{ uid: "user123" }, true],
      [{ uid: null }, false],
      [{ uid: 123 }, false],
      [{ uid: "" }, false],
      [null, false],
      [undefined, false]
    ])("should handle validate auth %p and isValid: %p", (input, isValid) => {
      if (!isValid) {
        expect(() => Validator.validateAuth(input)).toThrow(UnauthenticatedError);
      } else {
        expect(() => Validator.validateAuth(input)).not.toThrow();
      }
    });
  });
});
