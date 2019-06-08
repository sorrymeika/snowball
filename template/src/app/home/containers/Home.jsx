import React from "react";

export default function Home({ onButtonClick }) {
    return (
        <div>
            Home
            <button onClick={onButtonClick}>Click me to `Test`!</button>
        </div>
    );
}
