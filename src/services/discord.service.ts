import { Channel, Client, TextChannel } from "discord.js";
import { forEach } from "lodash";
import { UtilityService } from "./utility.service";

export class DiscordService {

  public utilityService: UtilityService;

  constructor() {
    this.utilityService = new UtilityService();
  }

  public getDiscordChannel = (channels: any[], channelName: string, channelCategory: string): TextChannel => {
    const channel: TextChannel = channels.filter((channel: TextChannel) => channel.name === channelName && channel.parent.name.toLowerCase() === channelCategory)[0];
    return channel;
  }

  public getDiscordChannels = async (discordClient: Client): Promise<Channel[]> => {
    const channels: TextChannel[] = [ ...discordClient.channels.cache.entries() ]
      .filter(([id, channel]: [string, any]) => channel.type === 'text')
      .map((channel: any) => channel[1]
    );
    return channels;
  }

  public postChangelogUpdates = async (changelog: string, channel: TextChannel): Promise<void> => {
      let changelogLength = changelog.length;
      if (changelogLength > 2000) {
        const changelogMultiplyer = changelogLength / 2000;
        const changelogPosts: string[] = [
          changelog.substring(0, changelogLength * changelogMultiplyer),
        ];
        changelogLength = changelogLength - (changelogLength * changelogMultiplyer);
        while (changelogLength > 2000) {
          changelogPosts.push(changelog.substring((changelogLength * changelogMultiplyer) + 1, changelogLength));
          changelogLength = changelogLength - (changelogLength * changelogMultiplyer);
        }
        forEach(changelogPosts, async (post: string) => {
          await channel.send(post).catch((error: any) => this.utilityService.log(error));
        });
      } else {
        await channel.send(changelog).catch((error: any) => this.utilityService.log(error));
      }
      this.utilityService.log(`Changelog has been updated successfully`);
  }

  public post = async (posts: string[], channel: TextChannel): Promise<void> => {
      if (posts.length > 0) {
        forEach(posts, async (postLink: string) => await channel.send(postLink).catch((error: any) => this.utilityService.log(error)));
      }
  }
}
