
let now = new Date();
let year = now.getFullYear();
let month = now.getMonth();

const currentDate = document.querySelector(".current-date");

// 이전 달
const preD = () => {
  month--;
  if (month < 0) {
    month = 11;
    year--;
  }
  currentDate.innerHTML= `${year}년 ${month+1}월`;
  // console.log("이전 버튼 클릭됨");
};

// 다음 달
const afterD = () => {
  month++;
  if (month > 11) {
    month = 0;
    year++;
  }
  currentDate.innerHTML= `${year}년 ${month+1}월`;
  // console.log("다음 버튼 클릭됨");
  // console.log(month);
};

// 오늘 날짜로 돌아가기
const todayD = () => {
  const today = new Date();
  year = today.getFullYear();
  month = today.getMonth();
  currentDate.innerHTML= `${year}년 ${month+1}월`;
 console.log("Today 버튼 클릭됨");
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("before").addEventListener("click", preD);
  document.getElementById("after").addEventListener("click", afterD);
  document.getElementById("today").addEventListener("click", todayD);
});

const enroll=()=>{
  const todo=document.getElementById("todo1").value;
  const todos = JSON.parse(localStorage.getItem("todos")) || [];
  todos.push(todo);
  localStorage.setItem("todos", JSON.stringify(todos));
  // 6. 입력창 비우기
  document.getElementById("todo1").value = "";

  const embark = document.getElementById("embark");
  const todoDiv = document.createElement("div");
  todoDiv.textContent = todo;

  embark.appendChild(todoDiv); // 🔹 append로 누적 표시

  // 입력창 초기화
  input.value = "";
}

const deleteAllTodos=()=>{

  localStorage.removeItem("todos");
  const del=document.getElementById("embark");
  del.innerHTML="";
  alert("일정이 삭제되었습니다. ");
}
