export class UtilityService {

  public log = (status: string, seperator?: boolean): void => {
    console.log(`[${new Date().toLocaleTimeString()}]: ${status}`);
    if (seperator) {
      this.logSeperator();
    }
  }

  public logSeperator = (): void => { console.log('############################################################'); }
}
