const puppeteer = require("puppeteer"); // ^22.6.0
const scrape = async() => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    const url = "https://apiv4.dineoncampus.com/locations/686d10a81fea2d6aaeb9f733/menu?date=2025-10-26&period=686d10a81fea2d6aaeb9f745";
    const response = await page.goto(url);
    const data = await response.json()
    console.log(data.period.categories[1].items[1])
        // const data = await page.evaluate(() => {
        //     return JSON.parse(document.body.innerText);
        // });

    // console.log(data);
    await browser.close();

}

scrape()