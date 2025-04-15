import { __decorate, __metadata } from "tslib";
import lunisolar from 'lunisolar';
import festivals from 'lunisolar/markers/festivals.zh-cn';
import { EarthBranch, LunarDay, LunarMonth, LunarYear, SolarDay, SolarMonth, SolarWeek, LegalHoliday, SolarFestival, LunarFestival } from 'tyme4ts';
import { Singleton } from './singleton';
import { timeSphere } from './time-sphere';
let Calendar = class Calendar {
    constructor() {
        lunisolar.Markers.add(festivals);
    }
    getFestivalsByDate(year, month, day) {
        const solarDay = SolarDay.fromYmd(year, month, day);
        const lunar = solarDay.getLunarDay();
        const lunarDayFrom = LunarDay.fromYmd(lunar.getYear(), lunar.getMonth(), lunar.getDay());
        return {
            lunarFestival: lunarDayFrom.getFestival()?.getName() ?? null,
            solarFestival: (() => {
                const festival = solarDay.getFestival()?.getName();
                const holiday = LegalHoliday.fromYmd(year, month, day)?.getName();
                const markersList = lunisolar(`${year}-${month}-${day}`).markers.list;
                if (holiday)
                    return holiday;
                if (festival)
                    return festival;
                if (markersList.length)
                    return markersList[0].name;
                return null;
            })(),
            solarTerm: lunisolar(`${year}-${month}-${day}`).solarTerm?.toString() ?? null
        };
    }
    getFestival(date) {
        const dateObj = timeSphere.parse(date);
        const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()];
        const { lunarFestival, solarFestival, solarTerm } = this.getFestivalsByDate(year, month, day);
        return lunarFestival ?? solarFestival ?? solarTerm ?? null;
    }
    nextFestival(date) {
        const startDate = timeSphere.parse(date);
        let currentDate = startDate.add(1, 'day');
        let searchCount = 0;
        const maxSearchDays = 730;
        while (searchCount < maxSearchDays) {
            const legalHoliday = this.legalHoliday(currentDate);
            if (legalHoliday) {
                return {
                    name: legalHoliday.name,
                    distance: currentDate.diff(startDate, 'day')
                };
            }
            const lunarFestival = this.lunarFestival(currentDate);
            if (lunarFestival) {
                return {
                    name: lunarFestival.name,
                    distance: currentDate.diff(startDate, 'day')
                };
            }
            const solarFestival = this.solarFestival(currentDate);
            if (solarFestival) {
                return {
                    name: solarFestival.name,
                    distance: currentDate.diff(startDate, 'day')
                };
            }
            const solarTerm = lunisolar(timeSphere.format(currentDate, 'YYYY-MM-DD')).solarTerm?.toString();
            if (solarTerm) {
                return {
                    name: solarTerm,
                    distance: currentDate.diff(startDate, 'day')
                };
            }
            currentDate = currentDate.add(1, 'day');
            searchCount++;
        }
        throw new Error('未能在搜索范围内找到下一个节日');
    }
    sixtyCycleInfo(date) {
        const parsed = timeSphere.parse(date);
        const year = parsed.year();
        const lunarYear = LunarYear.fromYear(year);
        const heavenStem = lunarYear.getSixtyCycle().getHeavenStem().getName();
        const earthBranch = lunarYear.getSixtyCycle().getEarthBranch().getName();
        const zodiac = EarthBranch.fromName(earthBranch).getZodiac().getName();
        return {
            heavenStem,
            earthBranch,
            zodiac,
            lunarYear: lunarYear.getName()
        };
    }
    directions(lunarYear) {
        const heavenStem = lunarYear.getSixtyCycle().getHeavenStem();
        return {
            joyDirection: heavenStem.getJoyDirection(),
            yangDirection: heavenStem.getYangDirection(),
            yinDirection: heavenStem.getYinDirection(),
            wealthDirection: heavenStem.getWealthDirection(),
            mascotDirection: heavenStem.getMascotDirection()
        };
    }
    lunarDayInfo(date) {
        const dateObj = timeSphere.parse(date);
        const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()];
        const solarDay = SolarDay.fromYmd(year, month, day);
        const lunarYear = LunarYear.fromYear(year);
        const lunarDay = solarDay.getLunarDay();
        const earthBranch = lunarYear.getSixtyCycle().getEarthBranch().getName();
        const zodiac = EarthBranch.fromName(earthBranch).getZodiac().getName();
        return {
            zodiac,
            constellation: `${solarDay.getConstellation()}座`,
            festival: this.getFestival(dateObj),
            beneficial: lunarDay.getRecommends().join('、'),
            unbeneficial: lunarDay.getAvoids().toString(),
            phase: lunarDay.getPhase().getName(),
            phenologyDay: solarDay.getPhenologyDay().getName(),
            directions: this.directions(lunarYear)
        };
    }
    format(date, format = 'lY年 lMlD') {
        return lunisolar(timeSphere.format(date, 'YYYY-MM-DD')).format(format);
    }
    solarDayCount(date) {
        const dateObj = timeSphere.parse(date);
        const [year, month] = [dateObj.year(), dateObj.month() + 1];
        const solarMonth = SolarMonth.fromYm(year, month);
        return solarMonth.getDayCount();
    }
    lunarDayCount(date) {
        const dateObj = timeSphere.parse(date);
        const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()];
        const solarDay = SolarDay.fromYmd(year, month, day);
        const lunar = solarDay.getLunarDay();
        return LunarMonth.fromYm(lunar.getYear(), lunar.getMonth()).getDayCount();
    }
    legalHoliday(date) {
        const parsed = timeSphere.parse(date);
        const [year, month, day] = parsed.toArray();
        const holiday = LegalHoliday.fromYmd(year, month + 1, day);
        if (!holiday)
            return null;
        return {
            name: holiday.getName(),
            type: 'legal',
            date: parsed.format('YYYY-MM-DD')
        };
    }
    solarFestival(date) {
        const parsed = timeSphere.parse(date);
        const [year, month, day] = [parsed.year(), parsed.month() + 1, parsed.date()];
        const solarDay = SolarDay.fromYmd(year, month, day);
        const festival = solarDay.getFestival();
        if (!festival)
            return null;
        return {
            name: festival.getName(),
            type: 'solar',
            date: parsed.format('YYYY-MM-DD')
        };
    }
    lunarFestival(date) {
        const parsed = timeSphere.parse(date);
        const [year, month, day] = [parsed.year(), parsed.month() + 1, parsed.date()];
        const solarDay = SolarDay.fromYmd(year, month, day);
        const lunarDay = solarDay.getLunarDay();
        const lunarDayFrom = LunarDay.fromYmd(lunarDay.getYear(), lunarDay.getMonth(), lunarDay.getDay());
        const festival = lunarDayFrom.getFestival();
        if (!festival)
            return null;
        return {
            name: festival.getName(),
            type: 'lunar',
            date: parsed.format('YYYY-MM-DD')
        };
    }
    allFestivals(date, options = {}) {
        const festivals = [];
        const { includeRange = false, onlyFirstDay = false } = options;
        const parsed = timeSphere.parse(date);
        const [year, month, day] = [parsed.year(), parsed.month() + 1, parsed.date()];
        const { lunarFestival, solarFestival, solarTerm } = this.getFestivalsByDate(year, month, day);
        const holiday = LegalHoliday.fromYmd(year, month, day);
        if (holiday) {
            if (!onlyFirstDay || !this.hasSameFestival(parsed.subtract(1, 'day'), holiday.getName())) {
                const festivalDetail = {
                    name: holiday.getName(),
                    type: 'legal',
                    date: parsed.format('YYYY-MM-DD')
                };
                if (includeRange) {
                    festivals.push({
                        ...festivalDetail,
                        startDate: parsed.toDate(),
                        endDate: parsed.toDate()
                    });
                }
                else {
                    festivals.push(festivalDetail);
                }
            }
        }
        if (lunarFestival) {
            const festivalDetail = {
                name: lunarFestival,
                type: 'lunar',
                date: parsed.format('YYYY-MM-DD')
            };
            if (includeRange) {
                festivals.push({
                    ...festivalDetail,
                    startDate: parsed.toDate(),
                    endDate: parsed.toDate()
                });
            }
            else {
                festivals.push(festivalDetail);
            }
        }
        if (solarFestival) {
            const festivalDetail = {
                name: solarFestival,
                type: 'solar',
                date: parsed.format('YYYY-MM-DD')
            };
            if (includeRange) {
                festivals.push({
                    ...festivalDetail,
                    startDate: parsed.toDate(),
                    endDate: parsed.toDate()
                });
            }
            else {
                festivals.push(festivalDetail);
            }
        }
        if (solarTerm) {
            const festivalDetail = {
                name: solarTerm,
                type: 'solar',
                date: parsed.format('YYYY-MM-DD')
            };
            if (includeRange) {
                festivals.push({
                    ...festivalDetail,
                    startDate: parsed.toDate(),
                    endDate: parsed.toDate()
                });
            }
            else {
                festivals.push(festivalDetail);
            }
        }
        return festivals;
    }
    hasSameFestival(date, festivalName) {
        const parsed = timeSphere.parse(date);
        const [year, month, day] = parsed.toArray();
        const holiday = LegalHoliday.fromYmd(year, month + 1, day);
        return holiday?.getName() === festivalName;
    }
};
Calendar = __decorate([
    Singleton(),
    __metadata("design:paramtypes", [])
], Calendar);
export const calendar = new Calendar();
//# sourceMappingURL=calendar.js.map