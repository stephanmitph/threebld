export const MoveType = { U: "y", D: "y", R: "x", L: "x", F: "z", B: "z", M: "x", E: "y", S: "z", x: "x", y: "y", z: "z" }
export const MoveDirectionCorrection = { U: -1, D: 1, R: -1, L: 1, F: -1, B: 1, M: 1, E: 1, S: -1, x: -1, y: -1, z: -1 }

export class Move { moveType: string; direction: 1 | -1; wide: boolean; double: boolean } // ------------------------------------------------------------------------------------------------------------------------------------------------------

export class Algorithm {
    name: string | null;
    string: string;
    parts: { name: string, algString: string }[];

    constructor() {
        this.parts = []
        this.string = ""
    }
}
