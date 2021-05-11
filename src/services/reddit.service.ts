import axios from 'axios';
import cheerio from 'cheerio';
import { TextChannel } from 'discord.js';
import { filter } from 'lodash';
import { UtilityService } from './utility.service';

export class RedditService {

    public postBoxSelector: string = '#SHORTCUT_FOCUSABLE_DIV > div:nth-child(4) > div > div > div > div._3ozFtOe6WpJEMUtxDOIvtU > div._1vyLCp-v-tE5QvZovwrASa > div._1OVBBWLtHoSPfGCRaPzpTf._3nSp9cdBpqL13CqjdMr2L_ > div.rpBJOHq2PR60pnwJlUyP0';
    public postSelector: string = '._2INHSNB8V5eaWp4P0rY_mE';
    public url: string = 'https://www.reddit.com';
    public utilityService: UtilityService;

    constructor() {
        this.utilityService = new UtilityService();
    }

    public getGMERecentPosts = async (channel: TextChannel): Promise<string[]> => {
        let response: any = await axios(`${this.url}/r/gme/new`)
            .catch((error: any) => this.utilityService.log(error));

        if (response.status !== 200) {
            throw Error('Error occurred while fetching Reddit Posts for r/GME/');
        }

        let posts: string[] = [];
        const html = response.data;
        const $ = cheerio.load(html);

        const redditPosts = $(this.postBoxSelector)
            .find(this.postSelector)
            .toArray()
            .filter((link: cheerio.Element, i: number) => !!link[i].children[0].attribs.href)
            .map((links: any) => `${this.url}${links.children[0].attribs.href}`);

        const postsAlreadyInChatroom: string[] = await channel.messages.fetch({
            limit: 100
        }).then(messages => {
            return [ ...messages ].map(([text, message]) => message.content);
        });

        posts = filter(redditPosts, (link: string) => !postsAlreadyInChatroom.includes(link));

        if (posts.length > 0) {
            this.utilityService.log(`Found ${posts.length} new Reddit Posts for r/GME/`)
        }

        return posts;
    }

    public getWSBRecentPosts = async (channel: TextChannel): Promise<string[]> => {
        let response: any = await axios(`${this.url}/r/wallstreetbets/new`)
            .catch((error: any) => this.utilityService.log(error));

        if (response.status !== 200) {
            throw Error('Error occurred while fetching Reddit Posts r/WALLSTREETBETS/');
        }

        let posts: string[] = [];
        const html = response.data;
        const $ = cheerio.load(html);

        const redditPosts = $(this.postBoxSelector)
            .find(this.postSelector)
            .toArray()
            .filter((link: cheerio.Element, i: number) => !!link[i].children[0].attribs.href)
            .map((links: any) => `${this.url}${links.children[0].attribs.href}`);

        const postsAlreadyInChatroom: string[] = await channel.messages.fetch({
            limit: 100
        }).then(messages => {
            return [ ...messages ].map(([text, message]) => message.content);
        });

        posts = filter(redditPosts, (link: string) => !postsAlreadyInChatroom.includes(link));

        if (posts.length > 0) {
            this.utilityService.log(`Found ${posts.length} new Reddit Posts for r/WALLSTREETBETS/`)
        }

        return posts;
    }
}
