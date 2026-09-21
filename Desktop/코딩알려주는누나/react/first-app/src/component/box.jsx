import React from "react";

const box = (props) => {
  console.log("props : ", props);
  return (
    <div className="box">
      <p>BOX{props.num}</p>
      <p>{props.name}</p>
    </div>
  );
};

export default box;
