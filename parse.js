const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
require("dotenv").config();

/**
 * PARSER DATA
 */
const ROCKAUTO = "https://www.rockauto.com/closeouts/?carcode=1446839";
const savedFilePath = path.join(__dirname, "savedResponse.json");
const timeout = process.env.TIMEOUT;

/**
 * TELEGRAM DATA
 */
const telegram = async (data) => {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHATID;
  const REGEXP = /[&\/\\#$~%*<>{}]/g;

  const message = `
    ====== 🕵🏼 ROCKAUTO 🕵🏼 ======%0A
    ===========================%0A
${data
  .map(
    ({ section, products }) =>
      `<b>${section?.replace(REGEXP, "")}</b>:%0A%0A${products
        ?.map(
          ({ brand, description, price, side }) =>
            `<b>${brand?.replace(REGEXP, "")}</b> - ${
              description?.replace(REGEXP, "") || ""
            } ${side ? `(${side.replace(REGEXP, "")})` : ""}%0A${
              price || ""
            }%0A`
        )
        ?.join("%0A")}`
  )
  ?.join("===========================%0A")}%0A%0A
<a href="https://www.rockauto.com/closeouts/?carcode=1446839">CLOSEOUTS</a>
    `;

  const URL = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${message}&disable_web_page_preview=true&parse_mode=html`;

  try {
    const response = await fetch(URL);
    const status = await response.json();

    if (!status.ok) {
      console.error("Telegram status !ok", response);
    }
  } catch (error) {
    console.error("Telegram sender catch error:", error);
  }
};

const parseHtml = (html) => {
  const $ = cheerio.load(html);
  const result = [];

  $(".ranavnode").each((_, element) => {
    const section = {};
    const products = [];

    const sectionName = $(element)
      .find(".nlabel a")
      .map((i, el) => $(el).text().trim())
      .get()
      .join(" / ");

    // Check if the sectionName contains multiple sub-sections (e.g., "Body & Lamp Assembly / Door Lock Actuator")
    if (sectionName.includes(" / ")) {
      // Skip the top-level parent section
      return;
    }

    section.section = sectionName;

    $(element)
      .find(".listing-inner")
      .each((index, listing) => {
        const product = {};

        product.brand = $(listing)
          .find(".listing-final-manufacturer")
          .text()
          .trim();
        product.model = $(listing)
          .find(".listing-final-partnumber")
          .text()
          .trim();
        product.description = $(listing)
          .find(".listing-text-row-moreinfo-truck .span-link-underline-remover")
          .text()
          .trim();
        product.price = $(listing).find(".listing-total").text().trim();

        const sideInfo = $(listing)
          .find(".listing-footnote-text")
          .text()
          .trim();
        if (sideInfo) {
          product.side = sideInfo;
        }

        products.push(product);
      });

    if (products.length > 0) {
      section.products = products;
      result.push(section);
    }
  });

  return result;
};

const fetchAndSave = async () => {
  try {
    const response = await axios.get(ROCKAUTO);
    const html = response.data;
    const parsedData = parseHtml(html);

    // Save the parsed data to a file
    fs.writeFileSync(
      savedFilePath,
      JSON.stringify(parsedData, null, 2),
      "utf8"
    );
    console.log("Initial response saved.");
  } catch (error) {
    console.error("Error fetching the URL:", error);
  }
};

const fetchAndCompare = async () => {
  try {
    const response = await axios.get(ROCKAUTO);
    const html = response.data;
    const newParsedData = parseHtml(html);

    // Load the previously saved data
    const oldParsedData = JSON.parse(fs.readFileSync(savedFilePath, "utf8"));

    // Compare the new data with the old data to find newly added items
    const newRecords = findNewRecords(oldParsedData, newParsedData);

    // Log the new records
    if (newRecords.length > 0) {
      telegram(newRecords);
    } else {
      console.log("No new records added.");
    }

    // Save the new data as the current data
    fs.writeFileSync(
      savedFilePath,
      JSON.stringify(newParsedData, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("Error fetching or comparing the data:", error);
  }
};

const findNewRecords = (oldData, newData) => {
  const newRecords = [];

  newData.forEach((newSection) => {
    const oldSection = oldData.find(
      (section) => section.section === newSection.section
    );

    // If the section doesn't exist in the old data, all its products are new
    if (!oldSection) {
      newRecords.push(newSection);
    } else {
      const newProducts = newSection.products.filter((newProduct) => {
        return !oldSection.products.some(
          (oldProduct) =>
            oldProduct.brand === newProduct.brand &&
            oldProduct.model === newProduct.model &&
            oldProduct.description === newProduct.description &&
            oldProduct.price === newProduct.price &&
            oldProduct.side === newProduct.side
        );
      });

      if (newProducts.length > 0) {
        newRecords.push({
          section: newSection.section,
          products: newProducts,
        });
      }
    }
  });

  return newRecords;
};

fetchAndSave();
setInterval(fetchAndCompare, timeout);
