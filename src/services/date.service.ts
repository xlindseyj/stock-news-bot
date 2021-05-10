export class DateService {

    public getDay = (): number => {
        return new Date().getDay();
    }

    public getHour = (): number => {
        return new Date().getHours();
    }
}
