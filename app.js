const puppeteer = require("puppeteer");
const getLastPage = require("./getLastPageNumber");

let endPage = 9;

getLastPage().then((result) => {
  endPage = result;
  console.log("END PAGE SONRA ", endPage);
  main(); // Call main() after endPage has been assigned
});

let linkCounter = 0;
const startTime = Date.now();



const getAllPageLinks = async (startPage, endPage) => {
  const browser = await puppeteer.launch({
    headless: "new",
  });

  const allLinks = [];

  try {
    const page = await browser.newPage();

    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
      const url = `https://www.make-it-in-germany.com/en/working-in-germany/job-listings?tx_solr%5Bpage%5D=${pageNumber}&tx_solr%5Bsort%5D=date_dateS+desc#list45536`;

      await page.goto(url);

      const jobLinks = await page.$$eval(
        ".list.list--jobs .card__head.head h3 a",
        (links) => links.map((link) => link.href)
      );

      allLinks.push(...jobLinks);
      console.log(jobLinks);
    }
  } catch (error) {
    console.error("Error in getAllPageLinks:", error);
  } finally {
    await browser.close();
  }

  return allLinks;
};




const scrapeDataFromLink = async (page, link) => {
  try {
    // Sayfa yüklenene kadar bekleyelim
    await page.goto(link, {
      waitUntil: "domcontentloaded",
    });

    const data = await page.evaluate(() => {
      const getTextContent = (selector) => {
        const selectedElement = document.querySelector(selector);
        return selectedElement ? selectedElement.textContent.trim() : null;
      };

      const jobTitle = getTextContent("header.head h1");
      const companyName = getTextContent("span.head__children");
      const referenceNumber = getTextContent("span.overview__reference-number");

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
            const value = paragraph.innerText.trim(); // veya paragraph.innerHTML.trim();
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
              : `item+${i}`;

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
      };
    });

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


const startPage = 1;
console.log("END PAGE ÖNCE ", endPage);

const main = async () => {
  try {
    // Remove the 'let' keyword to avoid redeclaration
    endPage = await getLastPage();
    console.log("END PAGE SONRA ", endPage);

    let linkCounter = 0;
    const startTime = Date.now();
    const startPage = 1;

    const browser = await puppeteer.launch({
      headless: "new",
    });

    const page = await browser.newPage();
    const allLinks = await getAllPageLinks(startPage, endPage);

    for (const link of allLinks) {
      await scrapeDataFromLink(page, link);
    }

    await browser.close();
  } catch (error) {
    console.error("Error:", error);
  }
};

















// ***************************************








// const puppeteer = require("puppeteer");
// const getLastPage = require("./getLastPageNumber");
// let endPage = 9;
// getLastPage().then((result) => {
//   endPage = result;
//   console.log("END PAGE SONRA ", endPage); // Log it here or move this line to where you need it
//   main(); // Call main() after endPage has beenn assigned
// });

// let linkCounter = 0; // Başlangıçta link sayacını sıfırla
// const startTime = Date.now(); // Başlangıç zamanını al
// const getAllPageLinks = async (startPage, endPage) => {
//   const browser = await puppeteer.launch({
//     headless: "new", // Yeni Headless modunu kullan
//   });

//   const allLinks = [];

//   for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
//     const page = await browser.newPage();
//     const url = `https://www.make-it-in-germany.com/en/working-in-germany/job-listings?tx_solr%5Bpage%5D=${pageNumber}&tx_solr%5Bsort%5D=date_dateS+desc#list45536`;

//     await page.goto(url);

//     const jobLinks = await page.$$eval(
//       ".list.list--jobs .card__head.head h3 a",
//       (links) => links.map((link) => link.href)
//     );

//     allLinks.push(...jobLinks);
//     await page.close();
//   }

//   await browser.close();
//   return allLinks;
// };

// const scrapeDataFromLink = async (page, link) => {
//   try {
//     // Sayfa yüklenene kadar bekleyelim
//     await page.goto(link, {
//       waitUntil: "domcontentloaded",
//     });

//     const data = await page.evaluate(() => {
//       const getTextContent = (selector) => {
//         const selectedElement = document.querySelector(selector);
//         return selectedElement ? selectedElement.textContent.trim() : null;
//       };

//       const jobTitle = getTextContent("header.head h1");
//       const companyName = getTextContent("span.head__children");
//       const referenceNumber = getTextContent("span.overview__reference-number");

//       const languageElement = Array.from(
//         document.querySelectorAll(".il li span.element")
//       ).find((el) => el.textContent.includes("Language / Application in"));
//       const language = languageElement
//         ? languageElement.textContent
//             .trim()
//             .replace("Language / Application in:", "")
//         : null;

//       const workingHoursElement = Array.from(
//         document.querySelectorAll(".il li span.element")
//       ).find((el) => el.textContent.includes("Working hours"));
//       const workingHours = workingHoursElement
//         ? workingHoursElement.textContent.trim().replace("Working hours:", "")
//         : null;

//       const workplaceElement = Array.from(
//         document.querySelectorAll(".il li span.element")
//       ).find((el) => el.textContent.includes("Workplace"));
//       const workplace = workplaceElement
//         ? workplaceElement.textContent.trim().replace("Workplace:", "")
//         : null;

//       const companySizeElement = Array.from(
//         document.querySelectorAll(".il li span.element")
//       ).find((el) => el.textContent.includes("Company size"));
//       const companySize = companySizeElement
//         ? companySizeElement.textContent.trim().replace("Company size:", "")
//         : null;

//       const employmentContractElement = Array.from(
//         document.querySelectorAll(".il li span.element")
//       ).find((el) => el.textContent.includes("Type of employment contract"));
//       const employmentContract = employmentContractElement
//         ? employmentContractElement.textContent
//             .trim()
//             .replace("Type of employment contract:", "")
//         : null;

//       const onlineSinceElement = Array.from(
//         document.querySelectorAll(".il li span.element")
//       ).find((el) => el.textContent.includes("Online since"));
//       const onlineSince = onlineSinceElement
//         ? onlineSinceElement.textContent.trim().replace("Online since:", "")
//         : null;
//       const jobDescription = document
//         .querySelector("article.text.detail-page__description p")
//         ?.textContent.trim();

//       // İLETİŞİM BİLGİLERİ
//       const contactInfo = {};
//       const addressInfo = {};

//       const additionalTextElement = document.querySelector(
//         ".text.additional__text"
//       );

//       if (additionalTextElement) {
//         const infoParagraphs = Array.from(
//           additionalTextElement.querySelectorAll("p")
//         );

//         infoParagraphs.forEach((paragraph) => {
//           const strongElement = paragraph.querySelector("strong");
//           if (strongElement) {
//             const key = strongElement.textContent.trim().replace(":", "");
//             const value = paragraph.innerText.trim(); // veya paragraph.innerHTML.trim();
//             contactInfo[key] = value;
//           }
//         });

//         const additionalAddressElement = document.querySelector(
//           ".additional__address"
//         );

//         if (additionalAddressElement) {
//           const addressItems =
//             additionalAddressElement.querySelectorAll(".additional__item");

//           addressItems.forEach((item, i) => {
//             const strongElement = item.querySelector("strong");
//             const key = strongElement
//               ? strongElement.textContent.trim().replace(":", "")
//               : `item+${i}`;

//             const linkElement = item.querySelector(".additional__item");
//             const value = linkElement
//               ? linkElement.textContent.trim()
//               : item.textContent.trim();

//             if (key) {
//               addressInfo[key] = value;
//             }
//           });
//         }
//       }

//       return {
//         jobTitle,
//         companyName,
//         referenceNumber,
//         language,
//         workingHours,
//         workplace,
//         companySize,
//         employmentContract,
//         onlineSince,
//         jobDescription,
//         contactInfo,
//         addressInfo,
//       };
//     });

//     console.log("Data:", data);

//     const endTime = Date.now(); // Bitiş zamanını al
//     const elapsedTime = (endTime - startTime) / 1000; // İşlem süresini hesapla (saniye cinsinden)
//     console.log(
//       `Processed Link (${linkCounter}): ${link} - Elapsed Time: ${elapsedTime} seconds`
//     ); // İşlenen link ve işlem süresini göster

//     linkCounter++; // Link işlendiğinde sayaç arttırılıyor
//   } catch (error) {
//     console.error("Hata:", error);
//   }
// };

// const startPage = 1;
// console.log("END PAGE ÖNCE ", endPage);

// const main = async () => {
//   try {
//     let endPage = await getLastPage();
//     console.log("END PAGE SONRA ", endPage);

//     let linkCounter = 0;
//     const startTime = Date.now();
//     const startPage = 1;

//     const browser = await puppeteer.launch({
//       headless: "new",
//     });

//     const page = await browser.newPage();
//     const allLinks = await getAllPageLinks(startPage, endPage);

//     for (const link of allLinks) {
//       await scrapeDataFromLink(page, link);
//     }

//     await browser.close();
//   } catch (error) {
//     console.error("Error:", error);
//   }
// };
