import AsyncStorage from '@react-native-async-storage/async-storage';

export class DateTimeService {
  private static DEFAULT_DATE_FORMAT = 'MM/DD/YYYY';
  private static DEFAULT_TIME_FORMAT = '12';

  static async getDateFormat(): Promise<string> {
    try {
      const format = await AsyncStorage.getItem('dateFormat');
      return format || this.DEFAULT_DATE_FORMAT;
    } catch (error) {
      console.error('Failed to get date format:', error);
      return this.DEFAULT_DATE_FORMAT;
    }
  }

  static async getTimeFormat(): Promise<string> {
    try {
      const format = await AsyncStorage.getItem('timeFormat');
      return format || this.DEFAULT_TIME_FORMAT;
    } catch (error) {
      console.error('Failed to get time format:', error);
      return this.DEFAULT_TIME_FORMAT;
    }
  }

  static async formatDate(date: Date | string): Promise<string> {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const format = await this.getDateFormat();

    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString();

    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      case 'MM-DD-YYYY':
        return `${month}-${day}-${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
      default:
        return `${month}/${day}/${year}`;
    }
  }

  static async formatTime(date: Date | string): Promise<string> {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const format = await this.getTimeFormat();

    if (format === '24') {
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const minutes = dateObj.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } else {
      // 12-hour format
      let hours = dateObj.getHours();
      const minutes = dateObj.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours || 12; // 0 should be 12
      return `${hours}:${minutes} ${ampm}`;
    }
  }

  static async formatDateTime(date: Date | string): Promise<string> {
    const [formattedDate, formattedTime] = await Promise.all([
      this.formatDate(date),
      this.formatTime(date),
    ]);
    return `${formattedDate} ${formattedTime}`;
  }

  static validateDateString(dateString: string, format: string): boolean {
    const patterns = {
      'MM/DD/YYYY': /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/,
      'DD/MM/YYYY': /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
      'DD-MM-YYYY': /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
      'MM-DD-YYYY': /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/,
      'YYYY-MM-DD': /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
    };

    const pattern = patterns[format as keyof typeof patterns];
    if (!pattern) return false;

    if (!pattern.test(dateString)) return false;

    // Additional validation to check if the date is valid
    const date = this.parseDate(dateString, format);
    return date.getTime() === date.getTime(); // NaN check
  }

  static parseDate(dateString: string, format: string): Date {
    let day: number, month: number, year: number;

    switch (format) {
      case 'DD/MM/YYYY':
        [day, month, year] = dateString.split('/').map(Number);
        break;
      case 'DD-MM-YYYY':
        [day, month, year] = dateString.split('-').map(Number);
        break;
      case 'MM-DD-YYYY':
        [month, day, year] = dateString.split('-').map(Number);
        break;
      case 'YYYY-MM-DD':
        [year, month, day] = dateString.split('-').map(Number);
        break;
      case 'MM/DD/YYYY':
      default:
        [month, day, year] = dateString.split('/').map(Number);
        break;
    }

    return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
  }
}
