/* Reminder: no need to restart mocf if you have made any change to this file */
const count = Math.round(Math.random() * 100);
const numList = [];

for (let i = 0; i < count; i++) {
  numList[i] = parseFloat((Math.random() * 100).toFixed(2));
}

module.exports = numList;
