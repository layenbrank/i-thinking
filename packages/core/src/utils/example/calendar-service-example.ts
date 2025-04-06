/**
 * 日历服务使用示例
 * @module calendar-service-example
 * @description 展示日历服务的各种使用场景和功能
 * @packageDocumentation
 */

import { calendarService } from "../calendar-service";
import { dateTimeService } from "../date-time-service";

/**
 * 基本使用示例
 * @description 展示日历服务的基本功能，包括获取农历日期、节日信息等
 */
async function basicExample() {
  console.log("\n=== 基本使用示例 ===");

  const date = dateTimeService.now();
  console.log("当前日期:", dateTimeService.format(date));

  // 1. 获取农历信息
  console.log("\n[农历信息]");
  console.log("农历日期:", calendarService.getLunarDate(date));
  console.log("六十甲子年:", calendarService.getSixtyCycle(date));

  // 2. 获取节日信息
  console.log("\n[节日信息]");
  console.log("当前节日:", calendarService.getFestival(date));
  const nextFestival = calendarService.getNextFestival(date);
  if (nextFestival) {
    console.log("下一个节日:", nextFestival.name);
    console.log("距离天数:", nextFestival.distance);
  }

  // 3. 获取周和年信息
  console.log("\n[周和年信息]");
  console.log(calendarService.getWeekAndDayIndex(date));
}

/**
 * 节日信息示例
 * @description 展示各种类型节日的查询和处理
 */
async function festivalExample() {
  console.log("\n=== 节日信息示例 ===");

  // 使用春节日期作为示例
  const springFestival = dateTimeService.parse("2024-02-10");
  console.log(
    "示例日期:",
    dateTimeService.format(springFestival, "YYYY年MM月DD日"),
  );

  // 1. 获取所有节日信息
  console.log("\n[所有节日]");
  const allFestivals = calendarService.getAllFestivals(springFestival);
  if (allFestivals.length > 0) {
    allFestivals.forEach((festival, index) => {
      console.log(`节日 ${index + 1}:`);
      console.log("- 名称:", festival.name);
      console.log("- 类型:", festival.type);
      console.log(
        "- 日期:",
        dateTimeService.format(festival.date, "YYYY年MM月DD日"),
      );
    });
  } else {
    console.log("今天没有任何节日");
  }

  // 2. 获取元旦节日信息
  console.log("\n[元旦示例]");
  const newYear = dateTimeService.parse("2024-01-01");
  const newYearFestivals = calendarService.getAllFestivals(newYear);
  newYearFestivals.forEach((festival, index) => {
    console.log(`节日 ${index + 1}:`);
    console.log("- 名称:", festival.name);
    console.log("- 类型:", festival.type);
    console.log(
      "- 日期:",
      dateTimeService.format(festival.date, "YYYY年MM月DD日"),
    );
  });

  // 3. 获取清明节气信息
  console.log("\n[清明示例]");
  const qingMing = dateTimeService.parse("2024-04-04");
  const qingMingFestivals = calendarService.getAllFestivals(qingMing);
  qingMingFestivals.forEach((festival, index) => {
    console.log(`节日 ${index + 1}:`);
    console.log("- 名称:", festival.name);
    console.log("- 类型:", festival.type);
    console.log(
      "- 日期:",
      dateTimeService.format(festival.date, "YYYY年MM月DD日"),
    );
  });
}

/**
 * 日期详细信息示例
 * @description 展示日期的完整信息，包括生肖、星座、宜忌等
 */
async function dateInfoExample() {
  console.log("\n=== 日期详细信息示例 ===");

  const date = dateTimeService.now();
  const dateInfo = calendarService.getDateInfo(date);

  console.log("\n[基本信息]");
  console.log("生肖:", dateInfo.zodiac);
  console.log("星座:", dateInfo.constellation);
  console.log("节日:", dateInfo.festival);

  console.log("\n[宜忌信息]");
  console.log("宜:", dateInfo.beneficial);
  console.log("忌:", dateInfo.unbeneficial);

  console.log("\n[其他信息]");
  console.log("月相:", dateInfo.phase);
  console.log("物候:", dateInfo.phenologyDay);

  console.log("\n[方位信息]");
  console.log("喜神方位:", dateInfo.directions.joyDirection);
  console.log("阳贵神方位:", dateInfo.directions.yangDirection);
  console.log("阴贵神方位:", dateInfo.directions.yinDirection);
  console.log("财神方位:", dateInfo.directions.wealthDirection);
  console.log("福神方位:", dateInfo.directions.mascotDirection);
}

/**
 * 月份信息示例
 * @description 展示农历和公历月份的信息
 */
async function monthExample() {
  console.log("\n=== 月份信息示例 ===");

  const date = dateTimeService.now();
  console.log("当前日期:", dateTimeService.format(date, "YYYY年MM月DD日"));

  console.log("\n[公历月信息]");
  const solarDays = calendarService.getSolarDayCount(date);
  console.log("当月天数:", solarDays);
  console.log("当前日期:", dateTimeService.format(date, "YYYY年MM月DD日"));

  console.log("\n[农历月信息]");
  const lunarDays = calendarService.getLunarDayCount(date);
  console.log("当月天数:", lunarDays);
  console.log("农历日期:", calendarService.getLunarDate(date));

  // 展示本月所有节日
  console.log("\n[本月节日]");
  const currentMonth = dateTimeService.parse(date);
  const startOfMonth = currentMonth.startOf("month");
  const endOfMonth = currentMonth.endOf("month");

  // 获取本月每一天的日期
  const daysInMonth = Array.from({ length: endOfMonth.date() }, (_, i) =>
    startOfMonth.add(i, "day"),
  );

  // 一次性获取所有日期的节日信息，只显示节日的第一天
  const monthFestivals = daysInMonth.map((day) => ({
    day: day.date(),
    festivals: calendarService.getAllFestivals(day, { onlyFirstDay: true }),
  }));

  // 只显示有节日的日期
  monthFestivals
    .filter(({ festivals }) => festivals.length > 0)
    .forEach(({ day, festivals }) => {
      console.log(`${day}日的节日:`);
      festivals.forEach((festival) => {
        console.log(`- ${festival.name} (${festival.type})`);
      });
    });
}

/**
 * 运行所有示例
 */
export async function runExamples() {
  try {
    await basicExample();
    await festivalExample();
    await dateInfoExample();
    await monthExample();
  } catch (error) {
    console.error("示例运行错误:", error);
  }
}

// 运行示例
// runExamples().catch(console.error)
