async function run() {
  try {
    const res = await fetch("https://query2.finance.yahoo.com/v8/finance/chart/MSFT?period1=1719792000&period2=1819792000&interval=1d");
    console.log(await res.text());
  } catch(e) {}
}
run();
