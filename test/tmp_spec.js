var tmp = require("../src/tmp").tmp;

describe("test tmp", function () {
    it("Test Tmp", function () {
        expect(tmp()).toBe("tmp");
    });
});