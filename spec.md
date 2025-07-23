# Puyo Puyo Game Specification

## 1. Overview

This document outlines the specifications for the Puyo Puyo game, a web-based application developed using React, TypeScript, and Node.js (with Socket.IO). The game supports both single-player (vs. AI) and online multiplayer modes.

## 2. Core Gameplay Mechanics

### 2.1. Puyo and Field

-   **Field:** The game is played on a 6x12 grid.
-   **Puyo:** Puyos are colored pieces that fall from the top of the field. There are five colors: Red, Green, Blue, Yellow, and Purple.
-   **Player Control:** The player controls a pair of Puyos, moving them left and right, rotating them, and dropping them faster.

### 2.2. Clearing Puyos

-   **Connection:** Four or more Puyos of the same color connected horizontally or vertically will be cleared.
-   **Chains (Rensa):** When Puyos are cleared, any Puyos above them fall. If this causes another set of four or more Puyos to connect, a chain reaction occurs.
-   **Scoring:** The score is calculated based on the number of Puyos cleared and the length of the chain.

### 2.3. Game Over

-   The game ends when a Puyo is placed in the third column from the left in the top row of the field.

## 3. Game Modes

### 3.1. AI Battle Mode

-   Players can play against an AI opponent.
-   The AI logic is designed to find the optimal move to create chains and attack the player.

### 3.2. Online Multiplayer Mode

-   Players can join a room using a Room ID to play against another player online.
-   The game state is synchronized between players using Socket.IO.

## 4. Advanced Rules

### 4.1. Nuisance Puyos (Ojama Puyo)

-   **Sending:** Performing chains sends Nuisance Puyos to the opponent's field. The number of Nuisance Puyos sent is calculated based on the chain's power.
-   **Receiving:** Nuisance Puyos fall from the top of the field and can only be cleared by clearing adjacent colored Puyos.
-   **Offsetting (Sousai):** If a player receives Nuisance Puyos while performing their own chain, the Nuisance Puyos can be offset. If the player's chain is powerful enough, they can send the remaining Nuisance Puyos back to the opponent.

### 4.2. All Clear Bonus

-   Clearing all Puyos from the field grants a significant bonus, sending a large number of Nuisance Puyos to the opponent.

## 5. AI Opponent Specification

The AI opponent follows a sophisticated logic to determine the best possible move.

### 5.1. Decision-Making Process

1.  **Simulation:** The AI simulates all possible moves for the current Puyo pair. This includes all possible horizontal positions and all four rotation states.
2.  **Evaluation:** For each simulated move, the AI evaluates the resulting field state based on a comprehensive evaluation function.
3.  **Execution:** The AI executes the move with the highest evaluation score.

### 5.2. Evaluation Function

The AI's evaluation function considers the following factors to determine the quality of a move:

-   **Chain Potential (Highest Priority):** The AI prioritizes moves that create the longest possible chains. The score for chains increases exponentially with the chain length.
-   **Number of Cleared Puyos:** Clearing a larger number of Puyos at once is rewarded.
-   **Field Height:** The AI is penalized for placing Puyos high on the field, as this increases the risk of game over.
-   **Color Grouping:** The AI is rewarded for placing Puyos of the same color adjacent to each other, as this increases the potential for future chains.

### 5.3. AI Behavior Cycle

1.  The AI's turn begins.
2.  It waits for a short duration (500ms) for the player to visually register the start of the turn.
3.  It calculates the best move using the `findBestAIMove` function.
4.  It instantly moves the Puyo to the calculated optimal position.
5.  It drops the Puyo to the bottom of the field.
6.  The `fixPuyo` function is called to handle chain reactions and Nuisance Puyo calculations.
7.  The AI's turn ends, and it waits for the next turn.

## 6. Technical Stack

-   **Frontend:** React, TypeScript
-   **Backend:** Node.js, Express, Socket.IO
-   **Testing:** Playwright for E2E testing
