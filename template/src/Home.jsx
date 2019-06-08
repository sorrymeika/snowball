import React from "react";
import { navigation } from "snowball/app";

export default function Home() {
    return (
        <div>
            Home
            <button onClick={() => navigation.forward('/test')}>Click me to `Test`!</button>
        </div>
    );
}
