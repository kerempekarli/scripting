const mongoose = require("mongoose");
const puppeteer = require("puppeteer");
const getLastPage = require("./getLastPageNumber");
const startTime = Date.now();
const startPage = 1;
let lastPage = getLastPage()
let linkCounter = 0;

mongoose.connect("mongodb://localhost:27017/Etrade");
const db = mongoose.connection;

const dataSchema = new mongoose.Schema({
  jobTitle: String,
  companyName: String,
  referenceNumber: String,
  language: String,
  workingHours: String,
  workplace: String,
  companySize: String,
  employmentContract: String,
  onlineSince: String,
  jobDescription: String,
  contactInfo: Object,
  addressInfo: Object,
  pageNumber: Number,
  pageIndex: Number,
});
const DataModel = mongoose.model("Job", dataSchema);

const scrapeDataFromLink = async (page, link, pageNumber, pageIndex) => {
  try {
    // Sayfa yüklenene kadar bekleyelim
    await page.goto(link, {
      waitUntil: "domcontentloaded",
    });

    const data = await page.evaluate(
      (pageNumber, pageIndex) => {
        const getTextContent = (selector) => {
          const selectedElement = document.querySelector(selector);
          return selectedElement ? selectedElement.textContent.trim() : null;
        };

        const jobTitle = getTextContent("header.head h1");
        const companyName = getTextContent("span.head__children");
        const referenceNumber = getTextContent(
          "span.overview__reference-number"
        );

        const languageElement = Array.from(
          document.querySelectorAll(".il li span.element")
        ).find((el) => el.textContent.includes("Language / Application in"));
        const language = languageElement
          ? languageElement.textContent
              .trim()
              .replace("Language / Application in:", "")
          : null;

        const workingHoursElement = Array.from(
          document.querySelectorAll(".il li span.element")
        ).find((el) => el.textContent.includes("Working hours"));
        const workingHours = workingHoursElement
          ? workingHoursElement.textContent.trim().replace("Working hours:", "")
          : null;

        const workplaceElement = Array.from(
          document.querySelectorAll(".il li span.element")
        ).find((el) => el.textContent.includes("Workplace"));
        const workplace = workplaceElement
          ? workplaceElement.textContent.trim().replace("Workplace:", "")
          : null;

        const companySizeElement = Array.from(
          document.querySelectorAll(".il li span.element")
        ).find((el) => el.textContent.includes("Company size"));
        const companySize = companySizeElement
          ? companySizeElement.textContent.trim().replace("Company size:", "")
          : null;

        const employmentContractElement = Array.from(
          document.querySelectorAll(".il li span.element")
        ).find((el) => el.textContent.includes("Type of employment contract"));
        const employmentContract = employmentContractElement
          ? employmentContractElement.textContent
              .trim()
              .replace("Type of employment contract:", "")
          : null;

        const onlineSinceElement = Array.from(
          document.querySelectorAll(".il li span.element")
        ).find((el) => el.textContent.includes("Online since"));
        const onlineSince = onlineSinceElement
          ? onlineSinceElement.textContent.trim().replace("Online since:", "")
          : null;
        const jobDescription = document
          .querySelector("article.text.detail-page__description p")
          ?.textContent.trim();

        // İLETİŞİM BİLGİLERİ
        const contactInfo = {};
        const addressInfo = {};

        const additionalTextElement = document.querySelector(
          ".text.additional__text"
        );

        if (additionalTextElement) {
          const infoParagraphs = Array.from(
            additionalTextElement.querySelectorAll("p")
          );

          infoParagraphs.forEach((paragraph) => {
            const strongElement = paragraph.querySelector("strong");
            if (strongElement) {
              const key = strongElement.textContent.trim().replace(":", "");
              let value = paragraph.innerText.trim();

              // Anahtarın içeriğini, içindeki key değerini de kapsayacak şekilde temizleme
              value = value
                .replace(strongElement.textContent, "")
                .replace(/\n/g, "")
                .trim();

              contactInfo[key] = value;
            }
          });

          const additionalAddressElement = document.querySelector(
            ".additional__address"
          );

          if (additionalAddressElement) {
            const addressItems =
              additionalAddressElement.querySelectorAll(".additional__item");

            addressItems.forEach((item, i) => {
              const strongElement = item.querySelector("strong");
              const key = strongElement
                ? strongElement.textContent.trim().replace(":", "")
                : `AdressInfo+${i}`;

              const linkElement = item.querySelector(".additional__item");
              const value = linkElement
                ? linkElement.textContent.trim()
                : item.textContent.trim();

              if (key) {
                addressInfo[key] = value;
              }
            });
          }
        }

        return {
          jobTitle,
          companyName,
          referenceNumber,
          language,
          workingHours,
          workplace,
          companySize,
          employmentContract,
          onlineSince,
          jobDescription,
          contactInfo,
          addressInfo,
          pageNumber,
          pageIndex,
        };
      },
      pageNumber,
      pageIndex
    );

    const newData = new DataModel(data);
    await newData.save();

    console.log("Data:", data);

    const endTime = Date.now(); // Bitiş zamanını al
    const elapsedTime = (endTime - startTime) / 1000; // İşlem süresini hesapla (saniye cinsinden)
    console.log(
      `Processed Link (${linkCounter}): ${link} - Elapsed Time: ${elapsedTime} seconds`
    ); // İşlenen link ve işlem süresini göster

    linkCounter++; // Link işlendiğinde sayaç arttırılıyor
  } catch (error) {
    console.error("Hata:", error);
  }
};

const getAllPageLinksAndScrapeData = async (startPage, lastPage) => {


  lastPage = await getLastPage()
  const browser = await puppeteer.launch({ headless: "new" });
  
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0); // Set timeout to 0 for no timeout

  try {
    for (let pageNumber = startPage; pageNumber <= lastPage; pageNumber++) {
      const url = `https://www.make-it-in-germany.com/en/working-in-germany/job-listings?tx_solr%5Bpage%5D=${pageNumber}&tx_solr%5Bsort%5D=date_dateS+desc#list45536`;

      await page.goto(url);
      const jobLinks = await page.$$eval(
        ".list.list--jobs .card__head.head h3 a",
        (links) => links.map((link) => link.href)
      );

      await Promise.all(jobLinks.map((link, i) => scrapeDataFromLink(page, link, pageNumber, i)));

    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
};

getAllPageLinksAndScrapeData(startPage, lastPage).catch((error) =>
  console.error("Error:", error)
);
