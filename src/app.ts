import dotenv from 'dotenv';
import axios from 'axios';
import cheerio from 'cheerio';
import semver from 'semver';
import { Channel, Client, Message, TextChannel } from 'discord.js';
// import { CommandHandler } from './discord/commands';
import { discordConfig } from './discord/config';
import { config } from './config';
import { filter } from 'lodash';
import { DateService } from './services/date.service';
import { UtilityService } from './services/utility.service';
import { RedditService } from './services/reddit.service';
import { DiscordService } from './services/discord.service';

dotenv.config();

export default class Server {
  public PORT: number = Number(process.env.PORT) || 5001;
  public discordClient: Client = new Client();
  public startTime: string;
  public dateService: DateService;
  public discordService: DiscordService;
  public redditService: RedditService;
  public utilityService: UtilityService;
  // public commandHandler = new CommandHandler(discordConfig.prefix);
  public baseCryptoUrl: string = 'https://www.coindesk.com';
  public baseStockUrl: string = 'https://www.google.com/finance';

  get isCryptoAllowed(): boolean {
    return config.isCryptoAllowed;
  }

  get isCryptoNewsAllowed(): boolean {
    return true;
  }

  get isNewsAllowed(): boolean {
    return config.isNewsAllowed && (this.isCryptoNewsAllowed || this.isStockNewsAllowed);
  }

  get isNYSEWeek(): boolean {
    return this.dateService.getDay() >= 1 && this.dateService.getDay() < 6;
  }

  get isStocksAllowed(): boolean {
    return this.isNYSEWeek && this.isTradingHours && config.isStocksAllowed;
  }

  get isStockNewsAllowed(): boolean {
    return true;
  }

  get isTradingHours(): boolean {
    return this.dateService.getHour() > 9 && this.dateService.getHour() < 16;
  }

  constructor() {
    this.dateService = new DateService();
    this.discordService = new DiscordService();
    this.redditService = new RedditService();
    this.utilityService = new UtilityService();
  }

  public getCryptoNews = async (channel: TextChannel): Promise<string[]> => {
    let response: any = await axios(`${this.baseCryptoUrl}/news`)
      .catch((error: any) => this.utilityService.log(error));

    if (response.status !== 200) {
      throw Error('Error occurred while fetching Crypto News');
    }

    let news: string[] = [];
    const html = response.data;
    const $ = cheerio.load(html);

    const cryptoNews = $('#__next > div:nth-child(2) > main > section > div.story-stack-chinese-wrapper > div > div > section.page-area-dotted-content > div')
      .find('.text-content')
      .toArray()
      .map((links: any) => `${this.baseCryptoUrl}/news${links.children[1].attribs.href}`);

    const newsAlreadyInChatroom: string[] = await channel.messages.fetch({
      limit: 100
    }).then(messages => {
      return [ ...messages ].map(([text, message]) => message.content);
    });

    news = filter(cryptoNews, (link: string) => !newsAlreadyInChatroom.includes(link));

    if (news.length > 0) {
      this.utilityService.log(`Found ${news.length} new Crypto News`)
    }

    return news;
  }

  public getCryptoPrice = async (url: string): Promise<string> => {
    let response: any = await axios(url)
      .catch((error: any) => this.utilityService.log(error));

    if (response.status !== 200) {
      throw Error('Error occurred while fetching Crypto Prices');
    }
  
    const html = response.data;
    const $ = cheerio.load(html);
    const price = $('#export-chart-element > div > section > div.coin-info-list.price-list > div:nth-child(1) > div.data-definition > div').text();

    return price; 
  }

  public getTopStories = async (url: string, channel: TextChannel): Promise<any> => {
    let response: any = await axios(url)
      .catch((error: any) => this.utilityService.log(error));

    if (response.status !== 200) {
      throw Error('Error occurred while fetching Top Stories');
    }

    let news: string[] = [];
    const html = response.data;
    const $ = cheerio.load(html);

    const topStories = $('#yDmH0d > c-wiz > div > div.e1AOyf > div > div > div.fAThCb')
      .find('.z4rs2b')
      .toArray()
      .map((links: any) => links.children[0].attribs.href);

    const newsAlreadyInChatroom: string[] = await channel.messages.fetch({
      limit: 100
    }).then(messages => {
      return [ ...messages ].map(([text, message]) => message.content);
    });

    news = filter(topStories, (link: string) => !newsAlreadyInChatroom.includes(link));

    if (news.length > 0) {
      this.utilityService.log(`Found ${news.length} new Top Stories`)
    }

    return news;
  }

  public getStockNews = async (url: string, channel: TextChannel): Promise<any> => {
    let response: any = await axios(url)
      .catch((error: any) => this.utilityService.log(error));

    if (response.status !== 200) {
      throw Error('Error occurred while fetching Stock News');
    }

    let news: string[] = [];
    const html = response.data;
    const $ = cheerio.load(html);

    const stockNews = $('#yDmH0d > c-wiz.zQTmif.SSPGKf.u5wqUe > div > div.e1AOyf > main > div.Gfxi4 > div.D6ciZd')
      .find('.z4rs2b')
      .toArray()
      .map((links: any) => links.children[0].attribs.href);

    const newsAlreadyInChatroom: string[] = await channel.messages.fetch({
      limit: 100
    }).then(messages => {
      return [ ...messages ].map(([text, message]) => message.content);
    });

    news = filter(stockNews, (link: string) => !newsAlreadyInChatroom.includes(link));

    if (news.length > 0) {
      this.utilityService.log(`Found ${news.length} new Stock News for $${channel.name.toString().toUpperCase()}`)
    }

    return news;
  }

  public getStockPrice = async (url: string): Promise<string> => {
    let response: any = await axios(url)
      .catch((error: any) => this.utilityService.log(error));

    if (response.status !== 200) {
      throw Error('Error occurred while fetching Stock Prices');
    }
  
    const html = response.data;
    const $ = cheerio.load(html);
    const price = $('#yDmH0d > c-wiz > div > div.e1AOyf > main > div.VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.QZMA8b > c-wiz > div > div:nth-child(1) > div > div.rPF6Lc > div:nth-child(1) > div > div:nth-child(1) > div > span > div > div').text();

    return price;
  }

  public initializeDiscord = async (): Promise<void> => {
    this.utilityService.log('Attempting to connect to Discord server');

    this.discordClient.once('ready', async () => {
      this.utilityService.log('Discord server is live', true);
      this.utilityService.log('Updating changelog...');

      await this.updateChangelog();

      this.utilityService.log('Connecting to Google Finance...');
      this.utilityService.log('Connecting to Coin Desk...', true);
      
      await this.refreshNews();
      await this.refreshPosts();
      await this.refreshPrices();
      setInterval(this.refreshNews, 1000 * 60 * 1); // every 1 minute
      setInterval(this.refreshPosts, 1000 * 60 * 5); // every 5 minutes
      setInterval(this.refreshPrices, 1000 * 60 * 15); // every 15 minutes
    });

    this.discordClient.on('message', async (message: Message) => {
      // commands here
    });

    this.discordClient.on('error', (error) => {
      this.utilityService.log(`Discord server encountered an error: ${error}`, true);
    });

    this.discordClient.login(discordConfig.token);
  }

  public refreshNews = async (): Promise<void> => {
    this.utilityService.log(`Refreshing news`);

    let news: string[];
    let channel: TextChannel;
    const channels: Channel[] = await this.discordService.getDiscordChannels(this.discordClient);

    if (this.isNewsAllowed) {
      /*
        ##### Top Stories #####
      */
      channel = this.discordService.getDiscordChannel(channels, 'top-stories', 'news');
      news = await this.getTopStories(this.baseStockUrl, channel);
      await this.discordService.post(news, channel);

      if (this.isStockNewsAllowed) {
        /*
          ##### GME News #####
        */
        channel = this.discordService.getDiscordChannel(channels, 'gme', 'news');
        news = await this.getStockNews(`${this.baseStockUrl}/quote/GME:NYSE`, channel);
        await this.discordService.post(news, channel);
        /*
          ##### MNMD News #####
        */
        channel = this.discordService.getDiscordChannel(channels, 'mnmd', 'news');
        news = await this.getStockNews(`${this.baseStockUrl}/quote/MNMD:NASDAQ`, channel);
        await this.discordService.post(news, channel);
      }

      if (this.isCryptoNewsAllowed) {
        channel = this.discordService.getDiscordChannel(channels, 'crypto-news', 'news');
        news = await this.getCryptoNews(channel);
        await this.discordService.post(news, channel);
      }
    }
  }

  public refreshPosts = async (): Promise<void> => {
    this.utilityService.log(`Refreshing posts`);

    let channel: TextChannel;
    const channels: Channel[] = await this.discordService.getDiscordChannels(this.discordClient);
    // if reddit posts allowed
  
    /*
      ##### GME Reddit Posts #####
    */
    channel = this.discordService.getDiscordChannel(channels, 'gme', 'reddit');
    const redditGMEPosts = await this.redditService.getRecentPosts(channel, 'gme');
    await this.discordService.post(redditGMEPosts, channel);
    /*
      ##### MNMD Reddit Posts #####
    */
    channel = this.discordService.getDiscordChannel(channels, 'mnmd', 'reddit');
    const redditMNMDPosts = await this.redditService.getRecentPosts(channel, 'mnmd');
    await this.discordService.post(redditMNMDPosts, channel);
    /*
      ##### Penny Stocks Reddit Posts #####
    */
    channel = this.discordService.getDiscordChannel(channels, 'pennystocks', 'reddit');
    const redditPennyStocksPosts = await this.redditService.getRecentPosts(channel, 'pennystocks');
    await this.discordService.post(redditPennyStocksPosts, channel);
    /*
      ##### Wallstreet Bets Reddit Posts #####
    */
    channel = this.discordService.getDiscordChannel(channels, 'wallstreetbets', 'reddit');
    const redditWSBPosts = await this.redditService.getRecentPosts(channel, 'wallstreetbets');
    await this.discordService.post(redditWSBPosts, channel);
  }

  public refreshPrices = async (): Promise<void> => {
    this.utilityService.log(`Refreshing prices`);

    let price: string;
    let channel: TextChannel;
    const channels: Channel[] = await this.discordService.getDiscordChannels(this.discordClient);

    if (this.isStocksAllowed) {
      /*
        ##### GME Price #####
      */
      price = await this.getStockPrice(`${this.baseStockUrl}/quote/GME:NYSE`);
      channel = this.discordService.getDiscordChannel(channels, 'gme', 'prices');
      await channel.send(this.utilityService.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
      /*
        ##### MNMD Price #####
      */
      price = await this.getStockPrice(`${this.baseStockUrl}/quote/MNMD:NASDAQ`);
      channel = this.discordService.getDiscordChannel(channels, 'mnmd', 'prices');
      await channel.send(this.utilityService.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
    }

    if (this.isCryptoAllowed) {
      /*
        ##### BTC Price #####
      */
      price = await this.getCryptoPrice(`${this.baseCryptoUrl}/price/btc`);
      channel = this.discordService.getDiscordChannel(channels, 'btc', 'prices');
      await channel.send(this.utilityService.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
      /*
        ##### DOGE Price #####
      */
      price = await this.getCryptoPrice(`${this.baseCryptoUrl}/price/doge`);
      channel = this.discordService.getDiscordChannel(channels, 'doge', 'prices');
      await channel.send(this.utilityService.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
      /*
        ##### ETH Price #####
      */
      price = await this.getCryptoPrice(`${this.baseCryptoUrl}/price/eth`);
      channel = this.discordService.getDiscordChannel(channels, 'eth', 'prices');
      await channel.send(this.utilityService.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
      /*
        ##### XMR Price #####
      */
      price = await this.getCryptoPrice(`${this.baseCryptoUrl}/price/xmr`);
      channel = this.discordService.getDiscordChannel(channels, 'xmr', 'prices');
      await channel.send(this.utilityService.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
    }
  }

  public run = async (): Promise<void> => {
    this.startTime = new Date().toUTCString();

    this.utilityService.log(`Initializing Jake's stock/crypto information bot...`, true);
    await this.initializeDiscord();
  }

  public stop = (): void => {
    const endTime: string = new Date().toUTCString();
    this.utilityService.log(`Stock news ran from ${this.startTime} - ${endTime}`);
  }

  public updateChangelog = async (): Promise<void> => {
    let url: string = 'https://raw.githubusercontent.com/xlindseyj/stock-news-bot/master/CHANGELOG.md';
    let response: any = await axios(url)
      .catch((error: any) => this.utilityService.log(error));

    if (response.status !== 200) {
      throw Error('Error occurred while fetching CHANGELOG.md');
    }

    const html = response.data;
    const $ = cheerio.load(html);
    const changelog: string = html;

    const channels: Channel[] = await this.discordService.getDiscordChannels(this.discordClient);
    const channel = this.discordService.getDiscordChannel(channels, 'changelog', 'general');

    const version: string = await this.utilityService.getChangelogVersion(changelog);
    const currentVersionInChatroom: string = await this.utilityService.getCurrentChangelogVersion(channel);

    if (semver.lt(currentVersionInChatroom, version)) {
      await this.discordService.postChangelogUpdates(changelog, channel);
    } else {
      this.utilityService.log(`Changelog is already updated to the latest version: ${version}`, true);
    }
  }

  public validateSetup = async (): Promise<void> => {
    // Add more validations here
    if (!discordConfig.token) {
      throw new Error('Please specify your Discord token!');
    }
  }
}

const server = new Server();
server.validateSetup();
server.run().catch((error: Error) => new UtilityService().log(`${error}`, true));
