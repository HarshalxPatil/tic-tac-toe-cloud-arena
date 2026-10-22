
import { useEffect, useRef, useState } from "react";
import "./App.css";
import Auth from "./components/Auth";
import { supabase } from "./lib/supabase";

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const emptyBoard = () => Array(9).fill("");

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [player1, setPlayer1] = useState("Harshal");
  const [player2, setPlayer2] = useState("Player 2");
  const [namesLocked, setNamesLocked] = useState(false);

  const [names, setNames] = useState({
    X: "Harshal",
    O: "Player 2",
  });

  const [board, setBoard] = useState(emptyBoard);
  const [turn, setTurn] = useState("X");
  const [winner, setWinner] = useState("");
  const [draw, setDraw] = useState(false);

  const [scores, setScores] = useState({
    X: 0,
    O: 0,
    draws: 0,
  });

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Prevent saving the same completed round more than once.
  const savedRoundRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Unable to load session:", error.message);
      }

      setUser(data?.session?.user ?? null);
      setAuthLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load only this logged-in user's game history.
  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setHistory([]);
    }
  }, [user?.id]);

  async function loadHistory() {
    setHistoryLoading(true);

    const { data, error } = await supabase
      .from("games")
      .select("id, player_x, player_o, result, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("History loading failed:", error.message);
      setSaveMessage("Could not load history. Check your Supabase policies.");
    } else {
      setHistory(data ?? []);
    }

    setHistoryLoading(false);
  }

  async function saveCompletedGame(result) {
    if (!user || savedRoundRef.current) return;

    // Set immediately so rapid updates cannot insert duplicate rows.
    savedRoundRef.current = true;
    setSaveMessage("Saving match to the cloud...");

    const { error } = await supabase.from("games").insert({
      user_id: user.id,
      player_x: names.X,
      player_o: names.O,
      result,
    });

    if (error) {
      console.error("Match save failed:", error.message);
      setSaveMessage(`Match could not be saved: ${error.message}`);
      savedRoundRef.current = false;
      return;
    }

    setSaveMessage("Match saved successfully!");
    await loadHistory();
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      alert("Unable to log out. Please try again.");
      return;
    }

    setNamesLocked(false);
    resetBoard();
    setScores({ X: 0, O: 0, draws: 0 });
    setSaveMessage("");
  }

  function startGame() {
    const xName = player1.trim() || "Player 1";
    const oName = player2.trim() || "Player 2";

    setPlayer1(xName);
    setPlayer2(oName);
    setNames({ X: xName, O: oName });
    setNamesLocked(true);
    setScores({ X: 0, O: 0, draws: 0 });
    setSaveMessage("");
    resetBoard();
  }

  function checkWinner(cells) {
    for (const [a, b, c] of WINNING_LINES) {
      if (
        cells[a] &&
        cells[a] === cells[b] &&
        cells[a] === cells[c]
      ) {
        return cells[a];
      }
    }

    return "";
  }

  function handleCellClick(index) {
    if (board[index] || winner || draw || !namesLocked) return;

    const nextBoard = [...board];
    nextBoard[index] = turn;
    setBoard(nextBoard);

    const gameWinner = checkWinner(nextBoard);

    if (gameWinner) {
      setWinner(gameWinner);

      setScores((previous) => ({
        ...previous,
        [gameWinner]: previous[gameWinner] + 1,
      }));

      // The database stores the winning symbol: X or O.
      void saveCompletedGame(gameWinner);
    } else if (nextBoard.every((cell) => cell !== "")) {
      setDraw(true);

      setScores((previous) => ({
        ...previous,
        draws: previous.draws + 1,
      }));

      void saveCompletedGame("draw");
    } else {
      setTurn(turn === "X" ? "O" : "X");
    }
  }

  function resetBoard() {
    savedRoundRef.current = false;
    setBoard(emptyBoard());
    setTurn("X");
    setWinner("");
    setDraw(false);
    setSaveMessage("");
  }

  function changePlayers() {
    setNamesLocked(false);
    resetBoard();
    setScores({ X: 0, O: 0, draws: 0 });
  }

  if (authLoading) {
    return (
      <main className="arena">
        <section className="panel">
          <h2>Loading Cloud Arena...</h2>
          <p className="muted">Checking your account.</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <main className="arena">
      <header className="hero">
        <p className="eyebrow">✦ TWO PLAYER ARENA ✦</p>
        <h1>Tic-Tac-Toe</h1>
        <p className="subtitle">
          Two players. One board. Who rules the arena?
        </p>

        <p className="muted">Signed in as {user.email}</p>

        <button
          type="button"
          className="secondary-button"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </header>

      {!namesLocked && (
        <section className="setup panel">
          <h2>Choose your players</h2>
          <p className="muted">Enter both names to begin.</p>

          <label htmlFor="player1">Player 1 · X</label>
          <input
            id="player1"
            value={player1}
            maxLength={20}
            onChange={(e) => setPlayer1(e.target.value)}
            placeholder="Enter Player 1 name"
          />

          <label htmlFor="player2">Player 2 · O</label>
          <input
            id="player2"
            value={player2}
            maxLength={20}
            onChange={(e) => setPlayer2(e.target.value)}
            placeholder="Enter Player 2 name"
          />

          <button
            type="button"
            className="primary-button"
            onClick={startGame}
          >
            Start Match →
          </button>
        </section>
      )}

      {namesLocked && (
        <>
          <section className="scoreboard">
            <div
              className={`score-card ${
                turn === "X" && !winner && !draw ? "active" : ""
              }`}
            >
              <span className="symbol x-symbol">X</span>
              <span className="player-name">{names.X}</span>
              <strong>{scores.X}</strong>
              <small>WINS</small>
            </div>

            <div className="draw-card">
              <span className="muted">DRAWS</span>
              <strong>{scores.draws}</strong>
            </div>

            <div
              className={`score-card ${
                turn === "O" && !winner && !draw ? "active" : ""
              }`}
            >
              <span className="symbol o-symbol">O</span>
              <span className="player-name">{names.O}</span>
              <strong>{scores.O}</strong>
              <small>WINS</small>
            </div>
          </section>

          <section className="panel game-panel">
            <div className="status">
              {winner
                ? `🏆 ${names[winner]} wins this round!`
                : draw
                  ? "🤝 It's a draw!"
                  : `Your move, ${names[turn]} (${turn})`}
            </div>

            <div className="board">
              {board.map((cell, index) => (
                <button
                  type="button"
                  key={index}
                  className={`cell ${
                    cell ? `cell-${cell.toLowerCase()}` : ""
                  }`}
                  onClick={() => handleCellClick(index)}
                  disabled={Boolean(cell) || Boolean(winner) || draw}
                  aria-label={`Cell ${index + 1}${
                    cell ? `, ${cell}` : ""
                  }`}
                >
                  {cell}
                </button>
              ))}
            </div>

            {(winner || draw) && (
              <p className="round-message">
                {winner
                  ? `Well played, ${names[winner]}!`
                  : "Great game from both players!"}
              </p>
            )}

            {saveMessage && (
              <p className="muted" role="status">
                {saveMessage}
              </p>
            )}

            <button
              type="button"
              className="primary-button"
              onClick={resetBoard}
            >
              ↻ {winner || draw ? "Play Next Round" : "Restart Round"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={changePlayers}
            >
              Change Players
            </button>
          </section>
        </>
      )}

      <section className="panel game-history">
        <h2>🏆 Game History</h2>
        <p className="muted">
          Your recently completed matches, saved in the cloud.
        </p>

        {historyLoading ? (
          <p className="muted">Loading match history...</p>
        ) : history.length === 0 ? (
          <p className="muted">
            No saved matches yet. Finish a round to see it here.
          </p>
        ) : (
          <div className="history-list">
            {history.map((game) => (
              <article className="history-item" key={game.id}>
                <div>
                  <strong>
                    {game.player_x} (X) vs {game.player_o} (O)
                  </strong>
                  <p className="muted">
                    {new Date(game.created_at).toLocaleString()}
                  </p>
                </div>

                <span className="history-result">
                  {game.result === "draw"
                    ? "Draw"
                    : `${game.result} wins`}
                </span>
              </article>
            ))}
          </div>
        )}

        <button
          type="button"
          className="secondary-button"
          onClick={loadHistory}
          disabled={historyLoading}
        >
          ↻ Refresh History
        </button>
      </section>

      <footer>
        TIC-TAC-TOE CLOUD ARENA · LOCAL TWO-PLAYER MODE
      </footer>
    </main>
  );
}

export default App;
