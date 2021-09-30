import fs from "fs";
import path from "path";
import {isGitFile} from "../../../../lib/events/utils";
import {randomRepoPath} from "../../../helpers/helpers";

const gitFilePath = path.join(".git", "objects", "12345");
const normalFilePath = path.join("abc", "12345.js");

const repoPath = randomRepoPath();

beforeAll(() => {
    if (fs.existsSync(repoPath)) {
        fs.rmdirSync(repoPath);
    }
    // Create directories
    fs.mkdirSync(repoPath, { recursive: true });
});

afterAll(() => {
    fs.rmdirSync(repoPath, { recursive: true });
});

test("isGitFile to be true",  () => {
    expect(isGitFile(gitFilePath)).toBe(true);
});

test("isGitFile to be false",  () => {
    expect(isGitFile(normalFilePath)).toBe(false);
});
