import yahooFinance from 'yahoo-finance2';
async function run() {
  console.log("Fetching MSFT...");
  try {
    const results = await yahooFinance.historical("MSFT", {
      period1: "2024-05-01",
      period2: "2024-05-08",
      interval: "1d"
    });
    console.log(results);
  } catch (e) {
    console.error(e);
  }
}
run();
