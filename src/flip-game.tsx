import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Shuffle, ArrowLeft, Plus, Minus, Check, X, Trophy, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import bgImage from "@assets/generated_images/abstract_energetic_neon_lines_background.png";

type Level = 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Elite';
type Sport = 'trampoline' | 'cliff-jumping' | 'parkour' | 'skiing';

interface Trick {
  id: number;
  name: string;
  level: string;
  description: string;
  tips: string;
  orderIndex: number;
  score: number;
  sport: string;
}

const SPORTS: { id: Sport; label: string; icon: string }[] = [
  { id: 'trampoline', label: 'Trampoline', icon: '🤸' },
  { id: 'cliff-jumping', label: 'Cliff Jumping', icon: '🏊' },
  { id: 'parkour', label: 'Parkour', icon: '🏃' },
  { id: 'skiing', label: 'Skiing', icon: '⛷️' },
];

interface Player {
  name: string;
  letters: string;
}

interface ComboTrick {
  trick: Trick;
  grab?: string;
}

const LEVELS: Level[] = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];
const FLIP_LETTERS = ['F', 'L', 'I', 'P'];
const GRABS = ['Safety', 'Double Safety', 'Japan', 'Mute', 'Seatbelt', 'Double Seatbelt', 'Nose Grab', 'Double Nose Grab'];

type BodyState = 'FEET' | 'BUM' | 'BACK' | 'STOMACH' | 'DOG';

function getTrickTransition(trick: Trick): { from: BodyState[]; to: BodyState } {
  const name = trick.name.toLowerCase();
  
  if (name.includes('progression')) {
    if (name.includes('to feet')) return { from: ['FEET'], to: 'FEET' };
    return { from: ['FEET'], to: 'BACK' };
  }
  
  if (name === '180 to bum' || name.includes('180 too bum') || name.includes('180 to bum')) return { from: ['FEET'], to: 'BUM' };
  if (name === '180 to back' || name.includes('180 too back') || name.includes('180 to back')) return { from: ['FEET'], to: 'BACK' };
  if (name === '360 to back' || name.includes('360 too back') || name.includes('360 to back')) return { from: ['FEET'], to: 'BACK' };
  if (name === '360 to bum' || name.includes('360 too bum') || name.includes('360 to bum')) return { from: ['FEET'], to: 'BUM' };
  if (name.includes('backflip set') || name.includes('hips up')) return { from: ['FEET'], to: 'BACK' };
  if (name === '180 to stomach' || name.includes('180 too stomach') || name.includes('180 to stomach')) return { from: ['FEET'], to: 'STOMACH' };
  if (name === '360 to stomach' || name.includes('360 too stomach') || name.includes('360 to stomach')) return { from: ['FEET'], to: 'STOMACH' };
  if (name === '180 to dog' || name.includes('180 too dog') || name.includes('180 to dog')) return { from: ['FEET'], to: 'DOG' };
  
  if (name === 'bum 180') return { from: ['BUM'], to: 'FEET' };
  if (name === 'bum 360' || name === 'bum drop 360') return { from: ['BUM'], to: 'FEET' };
  if (name === 'bum 540' || name === 'bum drop 540') return { from: ['BUM'], to: 'FEET' };
  if (name === 'bum drop rebounds') return { from: ['BUM'], to: 'FEET' };
  
  if (name.includes('back pullover to stomach') || name.includes('pullover to stomach') || name.includes('pullover too stomach')) return { from: ['BACK'], to: 'STOMACH' };
  if (name.includes('back pullover to bum') || name.includes('back pull over too bum') || name.includes('pullover to bum')) return { from: ['BACK'], to: 'BUM' };
  if (name.includes('back pullover to dog') || name.includes('back pull over too dog') || name.includes('pullover to dog')) return { from: ['BACK'], to: 'DOG' };
  if (name.includes('back pullover to back') || name.includes('back pull over to back')) return { from: ['BACK'], to: 'BACK' };
  if (name === 'back 180') return { from: ['BACK'], to: 'FEET' };
  if (name === 'back 360' || name === 'back drop 360') return { from: ['BACK'], to: 'FEET' };
  if (name === 'back 540' || name === 'back drop 540') return { from: ['BACK'], to: 'FEET' };
  if (name === 'back pullover' || name === 'pullover' || name === 'pullover to feet') return { from: ['BACK'], to: 'FEET' };
  if (name === 'back drop rebounds') return { from: ['BACK'], to: 'FEET' };
  
  if (name === 'stomach 180') return { from: ['STOMACH'], to: 'FEET' };
  if (name === 'stomach 360' || name === 'stomach drop 360') return { from: ['STOMACH'], to: 'FEET' };
  if (name === 'stomach 540' || name === 'stomach drop 540') return { from: ['STOMACH'], to: 'FEET' };
  if (name === 'stomach drop rebounds') return { from: ['STOMACH'], to: 'FEET' };
  if (name.includes('stomach to back')) return { from: ['STOMACH'], to: 'BACK' };
  if (name.includes('stomach to dog')) return { from: ['STOMACH'], to: 'DOG' };
  if (name.includes('stomach to bum')) return { from: ['STOMACH'], to: 'BUM' };
  
  if (name === 'dog 180') return { from: ['DOG'], to: 'FEET' };
  if (name === 'dog drop rebounds') return { from: ['DOG'], to: 'FEET' };
  if (name.includes('dog to bum')) return { from: ['DOG'], to: 'BUM' };
  if (name.includes('dog to back')) return { from: ['DOG'], to: 'BACK' };
  if (name.includes('dog to stomach')) return { from: ['DOG'], to: 'STOMACH' };
  if (name.includes('dog drop frount') || name.includes('dog drop front')) return { from: ['DOG'], to: 'FEET' };
  
  if (name === 'back to bum') return { from: ['BACK'], to: 'BUM' };
  if (name === 'back to stomach') return { from: ['BACK'], to: 'STOMACH' };
  if (name === 'back to dog') return { from: ['BACK'], to: 'DOG' };
  if (name === 'bum to back') return { from: ['BUM'], to: 'BACK' };
  if (name === 'bum to stomach') return { from: ['BUM'], to: 'STOMACH' };
  if (name === 'bum to dog') return { from: ['BUM'], to: 'DOG' };
  
  if (name.includes('back to bum to dog to stomach')) return { from: ['BACK'], to: 'STOMACH' };
  if (name.includes('stomach to dog to bum to back')) return { from: ['STOMACH'], to: 'BACK' };
  
  if (name === 'bum drop') return { from: ['BUM'], to: 'BUM' };
  if (name.includes('bum to dog front') || name.includes('bum to dog frount')) return { from: ['BUM'], to: 'DOG' };
  if (name === 'baby cradle' || name === 'baby craddle') return { from: ['BUM'], to: 'BACK' };
  if (name === 'cradle') return { from: ['BACK'], to: 'BACK' };
  if (name === 'swivel hips') return { from: ['BUM'], to: 'BUM' };
  if (name.includes('swivel hips to baby')) return { from: ['BUM'], to: 'BACK' };
  if (name.includes('swivel hips to seat roller')) return { from: ['BUM'], to: 'BUM' };
  if (name === 'seat roller') return { from: ['BUM'], to: 'BUM' };
  if (name === 'back drop') return { from: ['BACK'], to: 'BACK' };
  if (name.includes('turntable')) return { from: ['BACK'], to: 'BACK' };
  if (name === 'cat twist' || name === 'oppo cat twist') return { from: ['BACK'], to: 'BACK' };
  if (name === 'stomach drop') return { from: ['STOMACH'], to: 'STOMACH' };
  if (name === 'dog drop') return { from: ['DOG'], to: 'DOG' };
  
  if (name.includes('kaboom')) return { from: ['FEET'], to: 'BACK' };
  if (name.includes('cody')) return { from: ['STOMACH'], to: 'FEET' };
  if (name.includes('barani') && !name.includes('to')) return { from: ['FEET'], to: 'FEET' };
  
  const isSpinOnly = /^(oppo\s*)?\d+(\s+spin)?$/.test(name.trim()) || 
                     (name.match(/^\d+$/) !== null) ||
                     name === 'oppo 180' || name === 'oppo 270' || name === 'oppo 360' ||
                     name === 'oppo 450' || name === 'oppo 540' || name === 'oppo 630' ||
                     name === 'oppo 720' || name === 'oppo 900' || name === 'oppo 1080';
  if (isSpinOnly) return { from: ['FEET'], to: 'FEET' };
  
  const isFlipOrTwist = name.includes('flip') || name.includes('full') || 
                        name.includes('twist') || name.includes('cork') ||
                        name.includes('miller') || name.includes('fliffus') ||
                        name.includes('triffus') || name.includes('adolph') ||
                        name.includes('rudy') || name.includes('randy') ||
                        name.includes('misty') || name.includes('layout') ||
                        name.includes('double') || name.includes('triple');
  if (isFlipOrTwist && !name.includes('to ') && !name.includes('too ')) {
    return { from: ['FEET'], to: 'FEET' };
  }
  
  return { from: ['FEET'], to: 'FEET' };
}

function isGrabEligible(trick: Trick): boolean {
  const transition = getTrickTransition(trick);
  if (transition.from[0] !== 'FEET' || transition.to !== 'FEET') return false;
  
  const name = trick.name.toLowerCase();
  const excluded = ['pullover', 'turntable', 'cradle', 'swivel', 'donkey', 'set', 'hips up', 'flip', 'full', 'cork'];
  if (excluded.some(e => name.includes(e))) return false;
  
  const isSpin = /^\d+$/.test(trick.name.trim()) || name.includes('oppo') || name.includes('spin');
  const isJump = name.includes('star') || name.includes('jump');
  return isSpin || isJump;
}

function isComboExcluded(trick: Trick): boolean {
  const name = trick.name.toLowerCase();
  return name.includes('progression') || 
         name.includes('set') || 
         name.includes('drill') || 
         name.includes('hips up');
}

function generateValidCombo(pool: Trick[], targetLength: number, grabChance: number, useFlowMode: boolean): ComboTrick[] {
  const comboPool = pool.filter(t => !isComboExcluded(t));
  const maxAttempts = 150;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const combo: ComboTrick[] = [];
    let currentState: BodyState = 'FEET';
    let lastWasFeetToFeet = false;
    const usedIds = new Set<number>();
    
    for (let i = 0; i < targetLength; i++) {
      let validTricks = comboPool.filter(t => {
        const transition = getTrickTransition(t);
        if (!transition.from.includes(currentState)) return false;
        if (usedIds.has(t.id)) return false;
        if (useFlowMode && lastWasFeetToFeet && transition.from[0] === 'FEET' && transition.to === 'FEET') {
          return false;
        }
        return true;
      });
      
      if (validTricks.length === 0) {
        validTricks = comboPool.filter(t => {
          const transition = getTrickTransition(t);
          if (!transition.from.includes(currentState)) return false;
          if (usedIds.has(t.id)) return false;
          return true;
        });
      }
      
      if (validTricks.length === 0) break;
      
      const randomTrick = validTricks[Math.floor(Math.random() * validTricks.length)];
      usedIds.add(randomTrick.id);
      
      const transition = getTrickTransition(randomTrick);
      lastWasFeetToFeet = (transition.from[0] === 'FEET' && transition.to === 'FEET');
      
      let grab: string | undefined;
      if (isGrabEligible(randomTrick) && Math.random() < grabChance) {
        grab = GRABS[Math.floor(Math.random() * GRABS.length)];
      }
      
      combo.push({ trick: randomTrick, grab });
      currentState = transition.to;
    }
    
    let validateState: BodyState = 'FEET';
    let valid = true;
    for (const { trick } of combo) {
      const transition = getTrickTransition(trick);
      if (!transition.from.includes(validateState)) {
        valid = false;
        break;
      }
      validateState = transition.to;
    }
    
    const minLength = Math.min(2, targetLength);
    if (valid && combo.length >= minLength) return combo;
  }
  
  return [];
}

type GamePhase = 'setup' | 'playing' | 'setter' | 'matching' | 'gameOver';

export default function FlipGame() {
  const [sport, setSport] = useState<Sport>('trampoline');
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<Player[]>([{ name: 'Player 1', letters: '' }, { name: 'Player 2', letters: '' }]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [matchingPlayerIndex, setMatchingPlayerIndex] = useState(-1);
  const [currentTrick, setCurrentTrick] = useState<ComboTrick[] | null>(null);
  const [setterLanded, setSetterLanded] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  
  const [selectedLevels, setSelectedLevels] = useState<Level[]>(['Beginner', 'Novice']);
  const [comboLength, setComboLength] = useState(1);
  const [grabChance, setGrabChance] = useState(0.3);
  const [flowMode, setFlowMode] = useState(true);
  const [usedTrickIds, setUsedTrickIds] = useState<Set<number>>(new Set());
  
  const { data: tricks = [] } = useQuery<Trick[]>({
    queryKey: ["/api/tricks", sport],
    queryFn: async () => {
      const res = await fetch(`/api/tricks?sport=${sport}`);
      if (!res.ok) throw new Error("Failed to fetch tricks");
      return res.json();
    },
  });

  const addPlayer = () => {
    setPlayers([...players, { name: `Player ${players.length + 1}`, letters: '' }]);
  };

  const removePlayer = (index: number) => {
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    const updated = [...players];
    updated[index].name = name;
    setPlayers(updated);
  };

  const toggleLevel = (level: Level) => {
    if (selectedLevels.includes(level)) {
      if (selectedLevels.length > 1) {
        setSelectedLevels(selectedLevels.filter(l => l !== level));
      }
    } else {
      setSelectedLevels([...selectedLevels, level]);
    }
  };

  const startGame = () => {
    setPlayers(players.map(p => ({ ...p, letters: '' })));
    setCurrentPlayerIndex(0);
    setCurrentTrick(null);
    setSetterLanded(false);
    setWinner(null);
    setUsedTrickIds(new Set());
    setGamePhase('playing');
  };

  const generateTrick = () => {
    const pool = tricks.filter(t => selectedLevels.includes(t.level as Level));
    
    if (comboLength === 1) {
      const comboPool = pool.filter(t => !isComboExcluded(t) && !usedTrickIds.has(t.id));
      if (comboPool.length === 0) {
        const fallbackPool = pool.filter(t => !isComboExcluded(t));
        if (fallbackPool.length === 0) return;
        const randomTrick = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
        let grab: string | undefined;
        if (isGrabEligible(randomTrick) && Math.random() < grabChance) {
          grab = GRABS[Math.floor(Math.random() * GRABS.length)];
        }
        setCurrentTrick([{ trick: randomTrick, grab }]);
        setUsedTrickIds(new Set([randomTrick.id]));
      } else {
        const randomTrick = comboPool[Math.floor(Math.random() * comboPool.length)];
        let grab: string | undefined;
        if (isGrabEligible(randomTrick) && Math.random() < grabChance) {
          grab = GRABS[Math.floor(Math.random() * GRABS.length)];
        }
        setCurrentTrick([{ trick: randomTrick, grab }]);
        setUsedTrickIds(prev => new Set([...Array.from(prev), randomTrick.id]));
      }
    } else {
      const unusedPool = pool.filter(t => !usedTrickIds.has(t.id));
      let combo = generateValidCombo(unusedPool, comboLength, grabChance, flowMode);
      if (combo.length === 0) {
        combo = generateValidCombo(pool, comboLength, grabChance, flowMode);
        if (combo.length > 0) {
          setUsedTrickIds(new Set(combo.map(c => c.trick.id)));
        }
      } else {
        setUsedTrickIds(prev => new Set([...Array.from(prev), ...combo.map(c => c.trick.id)]));
      }
      if (combo.length > 0) {
        setCurrentTrick(combo);
      }
    }
    setGamePhase('setter');
    setSetterLanded(false);
  };

  const handleSetterResult = (landed: boolean) => {
    if (landed) {
      setSetterLanded(true);
      const nextMatcher = getNextActivePlayer(currentPlayerIndex);
      if (nextMatcher !== -1) {
        setMatchingPlayerIndex(nextMatcher);
        setGamePhase('matching');
      } else {
        nextTurn();
      }
    } else {
      nextTurn();
    }
  };

  const getNextActivePlayer = (fromIndex: number): number => {
    const activePlayers = players.filter(p => p.letters !== 'FLIP');
    if (activePlayers.length <= 1) return -1;
    
    let next = (fromIndex + 1) % players.length;
    while (next !== fromIndex) {
      if (players[next].letters !== 'FLIP') {
        return next;
      }
      next = (next + 1) % players.length;
    }
    return -1;
  };

  const handleMatchResult = (landed: boolean) => {
    if (!landed) {
      const updated = [...players];
      const currentLetters = updated[matchingPlayerIndex].letters;
      const nextLetter = FLIP_LETTERS[currentLetters.length];
      updated[matchingPlayerIndex].letters = currentLetters + nextLetter;
      setPlayers(updated);
      
      if (updated[matchingPlayerIndex].letters === 'FLIP') {
        const remaining = updated.filter(p => p.letters !== 'FLIP');
        if (remaining.length === 1) {
          setWinner(remaining[0].name);
          setGamePhase('gameOver');
          return;
        }
      }
    }
    
    const nextMatcher = getNextActivePlayer(matchingPlayerIndex);
    if (nextMatcher !== -1 && nextMatcher !== currentPlayerIndex) {
      setMatchingPlayerIndex(nextMatcher);
    } else {
      nextTurn();
    }
  };

  const nextTurn = () => {
    const remaining = players.filter(p => p.letters !== 'FLIP');
    if (remaining.length === 1) {
      setWinner(remaining[0].name);
      setGamePhase('gameOver');
      return;
    }
    if (remaining.length === 0) {
      setGamePhase('gameOver');
      return;
    }
    
    let next = getNextActivePlayer(currentPlayerIndex);
    if (next === -1) {
      const firstActive = players.findIndex(p => p.letters !== 'FLIP');
      next = firstActive >= 0 ? firstActive : 0;
    }
    setCurrentPlayerIndex(next);
    setCurrentTrick(null);
    setMatchingPlayerIndex(-1);
    setGamePhase('playing');
  };

  const resetGame = () => {
    setGamePhase('setup');
    setPlayers(players.map(p => ({ ...p, letters: '' })));
    setCurrentPlayerIndex(0);
    setCurrentTrick(null);
    setWinner(null);
    setUsedTrickIds(new Set());
  };

  const formatTrickDisplay = (combo: ComboTrick[]): string => {
    return combo.map(({ trick, grab }) => 
      grab ? `${trick.name} (${grab})` : trick.name
    ).join(' → ');
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 relative"
      style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/60" />
      
      <header className="relative z-20 flex items-center justify-between p-4 border-b border-white/10">
        <Link href="/">
          <Button variant="ghost" className="text-white/70 hover:text-white" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tricks
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Game of FLIP</h1>
        <div className="w-32" />
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <AnimatePresence mode="wait">
          {gamePhase === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-gray-900/80 border border-white/20 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Players</h2>
                <div className="space-y-3">
                  {players.map((player, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Input
                        value={player.name}
                        onChange={(e) => updatePlayerName(index, e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        data-testid={`input-player-${index}`}
                      />
                      {players.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePlayer(index)}
                          className="text-red-400 hover:text-red-300"
                          data-testid={`button-remove-player-${index}`}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={addPlayer}
                  variant="outline"
                  className="mt-3 border-white/20 text-white/70 hover:text-white"
                  data-testid="button-add-player"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Player
                </Button>
              </div>

              <div className="bg-gray-900/80 border border-white/20 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-white/70 text-sm block mb-2">Sport</label>
                    <div className="flex flex-wrap gap-2">
                      {SPORTS.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSport(s.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            sport === s.id
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                          }`}
                          data-testid={`game-sport-${s.id}`}
                        >
                          <span className="mr-1">{s.icon}</span>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-white/70 text-sm block mb-2">Difficulty Levels</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between border-purple-500/50 text-purple-300"
                          data-testid="dropdown-game-levels"
                        >
                          {selectedLevels.length === LEVELS.length ? 'All Levels' : 
                           `${selectedLevels.length} Level${selectedLevels.length > 1 ? 's' : ''} selected`}
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 bg-gray-900 border-gray-700 p-2">
                        {LEVELS.map((lvl) => (
                          <div
                            key={lvl}
                            className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer"
                            onClick={() => toggleLevel(lvl)}
                            data-testid={`toggle-game-${lvl.toLowerCase()}`}
                          >
                            <Checkbox 
                              checked={selectedLevels.includes(lvl)} 
                              className="border-purple-500 data-[state=checked]:bg-purple-600"
                            />
                            <span className="text-white text-sm">{lvl}</span>
                          </div>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-white/70 text-sm block mb-2">Combo Length</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((len) => (
                        <Button
                          key={len}
                          variant="outline"
                          size="sm"
                          onClick={() => setComboLength(len)}
                          className={`flex-1 ${
                            comboLength === len
                              ? 'bg-purple-600/50 border-purple-500 text-white'
                              : 'border-white/20 text-white/40 hover:text-white'
                          }`}
                          data-testid={`combo-length-${len}`}
                        >
                          {len === 1 ? '1 Trick' : `${len} Combo`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-white/70 text-sm block mb-2">Grab Chance: {Math.round(grabChance * 100)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={grabChance * 100}
                      onChange={(e) => setGrabChance(parseInt(e.target.value) / 100)}
                      className="w-full accent-purple-500"
                      data-testid="slider-grab-chance"
                    />
                  </div>

                  <div
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer"
                    onClick={() => setFlowMode(!flowMode)}
                    data-testid="toggle-flow-mode"
                  >
                    <div>
                      <span className="text-white text-sm">Flow Mode</span>
                      <p className="text-white/50 text-xs mt-0.5">No consecutive spin-to-spin in combos</p>
                    </div>
                    <Checkbox 
                      checked={flowMode} 
                      className="border-purple-500 data-[state=checked]:bg-purple-600"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 text-lg"
                data-testid="button-start-game"
              >
                Start Game
              </Button>
            </motion.div>
          )}

          {(gamePhase === 'playing' || gamePhase === 'setter' || gamePhase === 'matching') && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-gray-900/80 border border-white/20 rounded-xl p-4">
                <h2 className="text-lg font-bold text-white mb-3 text-center">Scoreboard</h2>
                <div className="grid grid-cols-2 gap-3">
                  {players.map((player, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        player.letters === 'FLIP'
                          ? 'bg-red-900/30 border-red-500/30 opacity-50'
                          : index === currentPlayerIndex
                          ? 'bg-purple-900/50 border-purple-500'
                          : index === matchingPlayerIndex
                          ? 'bg-orange-900/50 border-orange-500'
                          : 'bg-gray-800/50 border-gray-700'
                      }`}
                      data-testid={`scoreboard-player-${index}`}
                    >
                      <div className="text-white font-medium text-sm">{player.name}</div>
                      <div className="text-2xl font-bold tracking-wider mt-1">
                        {FLIP_LETTERS.map((letter, i) => (
                          <span
                            key={i}
                            className={player.letters.includes(letter) ? 'text-red-500' : 'text-gray-600'}
                          >
                            {letter}
                          </span>
                        ))}
                      </div>
                      {index === currentPlayerIndex && gamePhase === 'setter' && (
                        <span className="text-purple-400 text-xs">Setting</span>
                      )}
                      {index === matchingPlayerIndex && gamePhase === 'matching' && (
                        <span className="text-orange-400 text-xs">Matching</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {gamePhase === 'playing' && (
                <div className="bg-gray-900/80 border border-white/20 rounded-xl p-6 text-center">
                  <p className="text-white/70 mb-2">It's</p>
                  <p className="text-2xl font-bold text-white mb-4">{players[currentPlayerIndex].name}'s turn</p>
                  <Button
                    onClick={generateTrick}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-8 py-4"
                    data-testid="button-generate-trick"
                  >
                    <Shuffle className="w-5 h-5 mr-2" />
                    Generate Trick
                  </Button>
                </div>
              )}

              {(gamePhase === 'setter' || gamePhase === 'matching') && currentTrick && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/50 rounded-xl p-6"
                >
                  <div className="text-center mb-6">
                    <p className="text-purple-300 text-sm mb-2">
                      {gamePhase === 'setter' 
                        ? `${players[currentPlayerIndex].name} is setting:`
                        : `${players[matchingPlayerIndex].name} must match:`}
                    </p>
                    <h3 className="text-3xl font-bold text-white" data-testid="text-current-trick">
                      {formatTrickDisplay(currentTrick)}
                    </h3>
                    {currentTrick.length > 1 && (
                      <p className="text-purple-300/70 text-sm mt-2">{currentTrick.length}-trick combo</p>
                    )}
                  </div>

                  <div className="flex gap-4 justify-center">
                    {gamePhase === 'setter' ? (
                      <>
                        <Button
                          onClick={() => handleSetterResult(true)}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4"
                          data-testid="button-setter-landed"
                        >
                          <Check className="w-5 h-5 mr-2" />
                          Landed
                        </Button>
                        <Button
                          onClick={() => handleSetterResult(false)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4"
                          data-testid="button-setter-missed"
                        >
                          <X className="w-5 h-5 mr-2" />
                          Missed
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleMatchResult(true)}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4"
                          data-testid="button-match-landed"
                        >
                          <Check className="w-5 h-5 mr-2" />
                          Landed
                        </Button>
                        <Button
                          onClick={() => handleMatchResult(false)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4"
                          data-testid="button-match-missed"
                        >
                          <X className="w-5 h-5 mr-2" />
                          Missed (+{FLIP_LETTERS[players[matchingPlayerIndex].letters.length]})
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              <Button
                onClick={resetGame}
                variant="outline"
                className="w-full border-white/20 text-white/70 hover:text-white"
                data-testid="button-reset-game"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                End Game
              </Button>
            </motion.div>
          )}

          {gamePhase === 'gameOver' && winner && (
            <motion.div
              key="gameOver"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border border-yellow-500/50 rounded-xl p-8">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-4xl font-bold text-white mb-2">{winner} Wins!</h2>
                <p className="text-white/70">Game Over</p>
              </div>

              <div className="bg-gray-900/80 border border-white/20 rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-3">Final Scores</h3>
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        player.name === winner
                          ? 'bg-yellow-900/30 border border-yellow-500/30'
                          : 'bg-gray-800/50'
                      }`}
                      data-testid={`final-score-player-${index}`}
                    >
                      <span className="text-white font-medium">{player.name}</span>
                      <span className={`font-bold ${player.letters === 'FLIP' ? 'text-red-500' : 'text-green-400'}`}>
                        {player.letters || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={startGame}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4"
                  data-testid="button-play-again"
                >
                  Play Again
                </Button>
                <Button
                  onClick={resetGame}
                  variant="outline"
                  className="flex-1 border-white/20 text-white/70 hover:text-white py-4"
                  data-testid="button-new-game"
                >
                  New Game
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
