// let person = {
//   name: "hj",
//   age: 25,
// };

// // let name = person.name;
// // let age = person["age"];

// let {age}=person
// console.log(age)

// let array=[1,2,3,4]
// let [a,b,...rest]=array

// console.log(rest)

// spread
// 객체를 복사해서 내용을 그대로 가져옴

let person = {
  name: "hj",
  age: 12,
};

let person2 = {
  ...person, // 객체가 두개 생성되는 거임
};

let person3 = person;
console.log(person2);
console.log(person3);
console.log(person);
