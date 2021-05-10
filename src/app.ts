import dotenv from 'dotenv';
import axios from 'axios';
import cheerio from 'cheerio';
import { Channel, Client, Message, TextChannel } from 'discord.js';
// import { CommandHandler } from './discord/commands';
import { discordConfig } from './discord/config';
import { config } from './config';
import { filter, forEach } from 'lodash';
import { DateService } from './services/date.service';
import { UtilityService } from './services/utility.service';

dotenv.config();

export default class Server {
  public PORT: number = Number(process.env.PORT) || 5001;
  public discordClient: Client = new Client();
  public startTime: string;
  // public commandHandler = new CommandHandler(discordConfig.prefix);
  public baseCryptoUrl: string = 'https://www.coindesk.com/price';
  public baseStockUrl: string = 'https://www.google.com/finance';
  public newsUpToDate = false;

  get isCryptoAllowed(): boolean {
    return config.isCryptoAllowed;
  }

  get isNewsAllowed(): boolean {
    return config.isNewsAllowed;
  }

  get isNYSEWeek(): boolean {
    return this.dateService.getDay() >= 1 && this.dateService.getDay() < 6;
  }

  get isStocksAllowed(): boolean {
    return this.isNYSEWeek && this.isTradingHours && config.isStocksAllowed;
  }

  get isTradingHours(): boolean {
    return this.dateService.getHour() > 9 && this.dateService.getHour() < 16;
  }

  constructor(private dateService: DateService, private utilityService: UtilityService) {}

  public getDiscordChannel = (channels: any, ticker: string, channelCategory: string): TextChannel => {
    return channels.filter((channel: TextChannel) => channel.name === ticker && channel.parent.name === channelCategory)[0];
  }

  public getCurrentPriceMessage = (price: string): string => {
    return `[${new Date().toLocaleTimeString()}]: The current price is ${price}`;
  }

  public getCryptoPrice = async (url: string): Promise<string> => {
    let response: any = await axios(url)
      .catch((error) => this.utilityService.log(error));

    if (response.status !== 200){
      throw Error('Error occurred while fetching data');
    }
  
    const html = response.data;
    const $ = cheerio.load(html);
    const price = $('#export-chart-element > div > section > div.coin-info-list.price-list > div:nth-child(1) > div.data-definition > div').text();

    return price; 
  }

  public getTopStories = async (url: string, channel: TextChannel): Promise<any> => {
    let response: any = await axios(url)
    .catch((error) => this.utilityService.log(error));

    if (response.status !== 200){
      throw Error('Error occurred while fetching data');
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

    return news;
  }

  public getStockNews = async (url: string, channel: TextChannel): Promise<any> => {
    let response: any = await axios(url)
      .catch((error) => this.utilityService.log(error));

    if (response.status !== 200){
      throw Error('Error occurred while fetching data');
    }

    let news: string[] = [];
    const html = response.data;
    const $ = cheerio.load(html);

    const mostRecentNews = $('#yDmH0d > c-wiz.zQTmif.SSPGKf.u5wqUe > div > div.e1AOyf > main > div.Gfxi4 > div.D6ciZd')
      .find('.z4rs2b')
      .toArray()
      .map((links: any) => links.children[0].attribs.href);

    const newsAlreadyInChatroom: string[] = await channel.messages.fetch({
      limit: 100
    }).then(messages => {
      return [ ...messages ].map(([text, message]) => message.content);
    });

    news = filter(mostRecentNews, (link: string) => !newsAlreadyInChatroom.includes(link));

    return news;
  }

  public getStockPrice = async (url: string): Promise<string> => {
    let response: any = await axios(url)
      .catch((error) => this.utilityService.log(error));

    if (response.status !== 200){
      throw Error('Error occurred while fetching data');
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
      this.utilityService.log('Connecting to Google Finance...');
      this.utilityService.log('Connecting to Coin Desk...', true);
      await this.refreshPrices();
      setInterval(this.refreshPrices, 1000 * 60 * 15); // every 15 minutes
    });

    this.discordClient.on('message', async (message: Message) => {});

    this.discordClient.on('error', (error) => {
      this.utilityService.log(`Discord server encountered an error: ${error}`, true);
    });

    this.discordClient.login(discordConfig.token);
  }

  public postNews = async (news: string[], channel: TextChannel): Promise<void> => {
    if (news.length > 0) {
      forEach(news, (newsLink: string) => channel.send(newsLink).catch((error: any) => this.utilityService.log(error)));
    }
  }

  public refreshPrices = async (): Promise<void> => {
    // loop through array from config file for tickers
    this.utilityService.log(`Refreshing news and prices`, true);

    let news: string[];
    let price: string;
    let channel: TextChannel;

    const channels: Channel[] = [ ...this.discordClient.channels.cache.entries() ]
      .filter(([id, channel]: [string, any]) => channel.type === 'text')
      .map((channel: any) => channel[1]
    );

    if (this.isStocksAllowed) {
      /*
        ##### GME Price #####
      */
      price = await this.getStockPrice(`${this.baseStockUrl}/quote/${config.stocks[0]}:NYSE`);
      channel = this.getDiscordChannel(channels, config.stocks[0], config.categories[3]);
      await channel.send(this.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
      /*
        ##### MNMD Price #####
      */
      price = await this.getStockPrice(`${this.baseStockUrl}/quote/${config.stocks[1]}:NASDAQ`);
      channel = this.getDiscordChannel(channels, config.stocks[1], config.categories[3]);
      await channel.send(this.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
    }

    if (this.isNewsAllowed) {
      /*
        ##### Top Stories #####
      */
      channel = this.getDiscordChannel(channels, config.stocks[2], config.categories[4]);
      news = await this.getTopStories(this.baseStockUrl, channel);
      await this.postNews(news, channel);
      /*
        ##### GME News #####
      */
      channel = this.getDiscordChannel(channels, config.stocks[0], config.categories[2]);
      news = await this.getStockNews(`${this.baseStockUrl}/quote/${config.stocks[0]}:NYSE`, channel);
      await this.postNews(news, channel);
      /*
        ##### MNMD News #####
      */
      channel = this.getDiscordChannel(channels, config.stocks[1], config.categories[2]);
      news = await this.getStockNews(`${this.baseStockUrl}/quote/${config.stocks[1]}:NASDAQ`, channel);
      await this.postNews(news, channel);
    }

    if (this.isCryptoAllowed) {
      /*
        ##### BTC Price #####
      */
      price = await this.getCryptoPrice(`${this.baseCryptoUrl}/${config.cryptos[0]}`);
      channel = this.getDiscordChannel(channels, config.cryptos[0], config.categories[0]);
      await channel.send(this.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
      /*
        ##### DOGE Price #####
      */
      price = await this.getCryptoPrice(`${this.baseCryptoUrl}/${config.cryptos[1]}`);
      channel = this.getDiscordChannel(channels, config.cryptos[1], config.categories[0]);
      await channel.send(this.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
      /*
        ##### ETH Price #####
      */
      price = await this.getCryptoPrice(`${this.baseCryptoUrl}/${config.cryptos[2]}`);
      channel = this.getDiscordChannel(channels, config.cryptos[2], config.categories[0]);
      await channel.send(this.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
      /*
        ##### XMR Price #####
      */
      price = await this.getCryptoPrice(`${this.baseCryptoUrl}/${config.cryptos[3]}`);
      channel = this.getDiscordChannel(channels, config.cryptos[3], config.categories[0]);
      await channel.send(this.getCurrentPriceMessage(price)).catch((error: any) => this.utilityService.log(error));
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

  public validateSetup = async (): Promise<void> => {
    // Add more validations here
    if (!discordConfig.token) {
      throw new Error('Please specify your Discord token!');
    }
  }
}

const utilityService = new UtilityService();
const server = new Server(new DateService, utilityService);
server.validateSetup();
server.run().catch((error: Error) => utilityService.log(`${error}`, true));
