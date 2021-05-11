import { TextChannel } from "discord.js";

export class UtilityService {

  public getChangelogVersion = async (changelog: string): Promise<string> => {
    let version = changelog.split('## [v');
    version = version[1].split(']');
    return version[0];
  }

  public getCurrentChangelogVersion = async (channel: TextChannel): Promise<string> => {
    const messages: string[] = await channel.messages.fetch({
      limit: 100
    }).then(messages => {
      return [ ...messages ].map(([text, message]) => message.content);
    });
    const messagesLength: number = messages.length;
    const index: number = messagesLength - 1;
    let versionAlreadyInChatroom = messages.length > 0 ? messages[index].split('## [v')[1] : '0.0.0';
    versionAlreadyInChatroom = versionAlreadyInChatroom.split(']')[0];
    return versionAlreadyInChatroom;
  }

  public getCurrentPriceMessage = (price: string): string => {
    return `[${new Date().toLocaleTimeString()}]: The current price is ${price}`;
  }

  public log = (status: string, seperator?: boolean): void => {
    console.log(`[${new Date().toLocaleTimeString()}]: ${status}`);
    if (seperator) {
      this.logSeperator();
    }
  }

  public logSeperator = (): void => { console.log('############################################################'); }
}
