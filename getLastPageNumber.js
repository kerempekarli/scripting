const puppeteer = require("puppeteer");

async function extractNumberFromLink() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const url =
    "https://www.make-it-in-germany.com/en/working-in-germany/job-listings";
  await page.goto(url);

  // Bağlantıyı almak için gereken CSS sorgusu
  const dateLink = await page.$eval(
    ".sorting__item a.sorting__option--active",
    (link) => link.getAttribute("href")
  );

  await browser.close();

  // "list" kelimesinin sağındaki sayıyı alma
  const parts = dateLink.split("#list");
  let number = null;

  if (parts.length > 1) {
    const match = parts[1].match(/\d+/);
    number = match ? match[0] : null;
  }

  console.log("sadgdsgdsagdsa", number);

  // Değeri doğrudan çıkartmak için Promise.resolve kullanma
  return number;
}

module.exports = async () => {
   const data = await extractNumberFromLink()
   return data;  
};
