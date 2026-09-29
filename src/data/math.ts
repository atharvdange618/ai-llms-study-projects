import type { Case } from "../lib/eval.js";

// GSM8K-style word problems in four families: money/percent, ages, rates, counting.
// Each needs two or more steps, which is where answering directly tends to break.
export const MATH: Case<number>[] = [
  // money and percent
  {
    input:
      "A shirt costs $40. It is discounted by 25%, then a 10% tax is added to the discounted price. What is the final price in dollars?",
    expected: 33,
  },
  {
    input:
      "A worker earns $18 per hour for the first 40 hours of a week and 1.5 times that rate for every hour above 40. How much does she earn in dollars in a 46-hour week?",
    expected: 882,
  },
  {
    input:
      "A store sells pens in packs of 12 for $3. How much do 60 pens cost in dollars?",
    expected: 15,
  },
  {
    input:
      "An investment of $2000 grows by 10% in the first year and loses 10% in the second year. What is it worth in dollars after two years?",
    expected: 1980,
  },
  // ages
  {
    input:
      "Tom is 3 times as old as his son. In 12 years, Tom will be twice as old as his son. How old is Tom now?",
    expected: 36,
  },
  {
    input:
      "Maya is 4 years older than Leo. The sum of their ages is 30. How old is Maya?",
    expected: 17,
  },
  {
    input:
      "Ben's father is 30 years older than Ben. In 5 years, the father will be 3 times Ben's age. How old is Ben now?",
    expected: 10,
  },
  // rates and time
  {
    input:
      "A train travels 180 km in 2 hours, then 120 km in 3 hours. What is its average speed in km/h for the whole trip?",
    expected: 60,
  },
  {
    input:
      "A tank holds 500 liters and is 40% full. A pump adds 25 liters per minute. How many minutes until the tank is full?",
    expected: 12,
  },
  {
    input:
      "A cyclist rides uphill at 10 km/h for 30 minutes, then downhill at 30 km/h for 20 minutes. How many km did she ride in total?",
    expected: 15,
  },
  {
    input:
      "If 3 machines make 3 widgets in 3 minutes, how many widgets do 6 machines make in 9 minutes?",
    expected: 18,
  },
  {
    input:
      "A car uses 8 liters of fuel per 100 km. Fuel costs $1.50 per liter. How much does fuel for a 350 km trip cost in dollars?",
    expected: 42,
  },
  // counting
  {
    input:
      "A bakery makes 48 muffins. It sells 3/4 of them in the morning and half of the rest in the afternoon. How many muffins are left?",
    expected: 6,
  },
  {
    input:
      "Sara has 5 red, 7 blue and 8 green marbles. She gives away half of her blue marbles, rounded down, and buys 4 more red ones. How many marbles does she have now?",
    expected: 21,
  },
  {
    input:
      "Priya reads 20 pages on Monday, and each day after she reads 5 more pages than the day before. How many pages has she read in total by the end of Friday?",
    expected: 150,
  },
  {
    input:
      "A class has 30 students and 60% are girls. Half of the girls and a third of the boys wear glasses. How many students wear glasses?",
    expected: 13,
  },
];
