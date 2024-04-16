const fs = require('fs').promises;
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://news.ycombinator.com/';
const PAGE_SUFFIX = '?p=';

const scrapeHackerNews = async (page) => {
  try {
    const url = page > 1 ? `${BASE_URL}${PAGE_SUFFIX}${page}` : BASE_URL;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const newsItems = $('.athing').map((index, element) => {
      const titleElement = $(element).find('.title a').first();
      const title = titleElement.text().trim();
      const url = titleElement.attr('href');

      const commentsText = $(element).next().find('.subtext').text().trim();
      const matchComments = commentsText.match(/(\d+)\s+comments/);
      const comments = matchComments ? parseInt(matchComments[1], 10) : 0;

      const scoreText = $(element).next().find('.subtext .score').text().trim();
      const matchScore = scoreText.match(/\d+/);
      const score = matchScore ? parseInt(matchScore[0], 10) : 0;

      const user = $(element).next().find('.subtext .hnuser').text().trim();
      const age = $(element).next().find('.subtext .age').children().last().text().trim();

      return { title, url, comments, score, user, age };
    }).get();

    return newsItems;
  } catch (error) {
    console.error(`Error scraping Hacker News page ${page}:`, error);
    return [];
  }
};

const groupNewsByCommentRange = (newsItems) => {
  return newsItems.reduce((groupedNews, item) => {
    const comments = item.comments;
    let range;

    if (comments >= 0 && comments <= 100) {
      range = '0-100';
    } else if (comments >= 101 && comments <= 200) {
      range = '101-200';
    } else if (comments >= 201 && comments <= 300) {
      range = '201-300';
    } else {
      range = '301-n';
    }

    groupedNews[range].push(item);
    return groupedNews;
  }, { '0-100': [], '101-200': [], '201-300': [], '301-n': [] });
};

const exportToJsonFile = async (data) => {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile('hacker_news.json', jsonData);
    console.log('Data exported to hacker_news.json');
  } catch (error) {
    console.error('Error exporting to JSON:', error);
  }
};

const main = async () => {
  let currentPage = 1;
  let allNewsItems = [];

  while (true) {
    const newsItems = await scrapeHackerNews(currentPage);
    if (newsItems.length === 0) {
      break;
    }
    allNewsItems.push(...newsItems);
    currentPage++;
  }

  const groupedNews = groupNewsByCommentRange(allNewsItems);
  await exportToJsonFile(groupedNews);
};

main();
