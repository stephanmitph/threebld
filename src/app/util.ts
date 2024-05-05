export const MoveType = { U: "y", D: "y", R: "x", L: "x", F: "z", B: "z", M: "x", E: "y", S: "z", x: "x", y: "y", z: "z" }
export const MoveDirectionCorrection = { U: -1, D: 1, R: -1, L: 1, F: -1, B: 1, M: 1, E: 1, S: -1, x: -1, y: -1, z: -1 }

export class Move { moveType: string; direction: 1 | -1; wide: boolean; double: boolean; partName: string }

export class Algorithm {
    constructor(
        public name: string,
        public string: string,
        public category: string = "",
        public isBldAlgorithm: boolean = false,
        public parts: { name: string, algString: string }[] = [],
    ) {
        this.parseString();
    }

    // Return Moves to perform this algorithm
    public getMoves(): Move[] {
        return this.isBldAlgorithm ? this.getBldMoves() : this.stringToMoves(this.string, "Normal");
    }

    private getBldMoves(): Move[] {
        let setup = this.parts.filter(p => p.name == "setup")[0];
        let ii1 = this.parts.filter(p => p.name != "setup")[0];
        let ii2 = this.parts.filter(p => p.name != "setup")[1];
        let setupRev = { ...setup }; if (setupRev) setupRev.algString = this.reverseAlgorithmString(setupRev.algString);
        let ii1Rev = { ...ii1 }; ii1Rev.algString = this.reverseAlgorithmString(ii1Rev.algString);
        let ii2Rev = { ...ii2 }; ii2Rev.algString = this.reverseAlgorithmString(ii2Rev.algString);
        console.log([setup, ii1, ii2, ii1Rev, ii2Rev, setupRev])
        return [setup, ii1, ii2, ii1Rev, ii2Rev, setupRev]
            .filter(p => p != null)
            .map(p => this.stringToMoves(p.algString, p.name))
            .reduce((acc, curr) => acc.concat(curr), []);

    }

    private parseString(): void {
        // Losely check format
        if (this.string.substr(0, 1) != "[" || this.string.slice(-1) != "]") {
            console.error("Illegal bldNotationString")
            return null;
        }

        this.parts = [];

        // Remove [] 
        this.string = this.string.substr(1, this.string.length - 2)
        let insertInterChange = this.string.replace("[", "").replace("]", "").split(",");
        if (this.string.includes(":")) {
            this.parts.push({
                name: "setup",
                algString: this.string.split(":")[0].trim()
            });
            insertInterChange = this.string.split(":")[1].replace("[", "").replace("]", "").split(",");
        }
        this.parts.push({
            name: insertInterChange[0].length < insertInterChange[1].length ? "interchange" : "insert",
            algString: insertInterChange[0].trim()
        });
        this.parts.push({
            name: insertInterChange[1].length < insertInterChange[0].length ? "interchange" : "insert",
            algString: insertInterChange[1].trim()
        });
    }

    private reverseAlgorithmString(alg: string): string {
        return alg.split(" ").map(t => {
            if (t.includes("2")) return t
            if (t.includes("'"))
                return t.replace("'", "");
            return t + "'";
        }).reverse().join(" ");
    }

    private stringToMoves(s: string, partName: string): any[] {
        return s.split(" ").map(t => {
            return {
                moveType: t.substr(0, 1),
                direction: t.includes("'") ? -1 : 1,
                wide: t.toLowerCase().includes("w"),
                double: t.toLowerCase().includes("2"),
                partName: partName
            }
        });
    }
}
