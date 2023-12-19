const puppeteer = require("puppeteer");
const DataModel = require("./jobModel"); // dataModel.js dosyanızın yolu
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/Etrade");

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
   const startTime = Date.now();
  const startPage = 1;
  const lastPage = 353;
  let linkCounter = 0;

  async function getMaxPage() {
    try {
      const maxPage = await DataModel.findOne({}, { pageNumber: 1 }).sort({ pageNumber: -1 }).lean() || { pageNumber: 0 };

      if (!maxPage.pageNumber) {
        console.log("No records found in the database. Setting maxPage to 0.");
      }

      const maxPageIndex = await DataModel.findOne(
        { pageNumber: maxPage.pageNumber },
        { pageIndex: 1 }
      ).sort({ pageIndex: -1 }).lean() || { pageIndex: 0 };

      console.log("Max Page:", maxPage.pageNumber || 0);
      console.log("Max Page Index:", maxPageIndex.pageIndex || 0);

      return {
        lastProcessedPageNumber: maxPage.pageNumber || 0,
        lastProcessedPageIndex: maxPageIndex.pageIndex || 0
      };
    } catch (error) {
      console.error("Error while getting max page:", error);
      return {
        lastProcessedPageNumber: 0,
        lastProcessedPageIndex: 0,
      };
    }
  }

  async function scrapeDataFromLink(page, link, pageNumber, pageIndex) {
    try {
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

      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000;
      console.log(
        `Processed Link (${linkCounter}): ${link} - Elapsed Time: ${elapsedTime} seconds`
      );

      linkCounter++;
    } catch (error) {
      console.error("Error:", error);
    }
  }

  async function getAllPageLinksAndScrapeData(startPage, lastPage, lastProcessedPageNumber, lastProcessedPageIndex) {
    const browser = await puppeteer.launch({ headless: true });
  
    try {
      const page = await browser.newPage();
  
      for (let pageNumber = lastProcessedPageNumber; pageNumber <= lastPage; pageNumber++) {
        const url = `https://www.make-it-in-germany.com/en/working-in-germany/job-listings?tx_solr%5Bpage%5D=${pageNumber}&tx_solr%5Bsort%5D=date_dateS+desc#list45536`;
  
        await page.goto(url);
  
        const jobLinks = await page.$$eval(".list.list--jobs .card__head.head h3 a", (links) => links.map((link) => link.href));
  
        for (let i = lastProcessedPageIndex; i < jobLinks.length; i++) {
          const link = jobLinks[i];
  
          try {
            await scrapeDataFromLink(page, link, pageNumber, i);
          } catch (error) {
            console.error(`Error processing link ${link}:`);
            console.error(error);
          }
        }
  
        // Bu kısmı ekleyerek lastProcessedPageIndex değerini sıfırlıyoruz.
        lastProcessedPageIndex = 0;
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      await browser.close();
    }
  }
  

  // getMaxPage fonksiyonunu çağır ve dönen değerleri kullanarak getAllPageLinksAndScrapeData fonksiyonunu çağır
  getMaxPage().then(({ lastProcessedPageNumber, lastProcessedPageIndex }) => {
    getAllPageLinksAndScrapeData(startPage, lastPage, lastProcessedPageNumber, lastProcessedPageIndex);
  });
});
