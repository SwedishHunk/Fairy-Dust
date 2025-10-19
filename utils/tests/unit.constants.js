(() => {
  test("constants: JOINERS existerar och regex fungerar", function () {
    assertEq(Array.isArray(DPT_CONSTANTS.JOINERS), true);
    assertEq(typeof DPT_CONSTANTS.RX.JOINERS_RX.test, "function");
    assertEq(DPT_CONSTANTS.RX.JOINERS_RX.test("A vs. B"), true);
    assertEq(DPT_CONSTANTS.RX.JOINERS_RX.test("A feat B"), true);
  });
})();
