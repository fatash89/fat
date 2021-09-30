import fs from "fs";
import path from "path";

import {shouldIgnoreFile} from "../../../../lib/events/utils";
import {getSyncIgnoreFilePath, randomBaseRepoPath, randomRepoPath} from "../../../helpers/helpers";

const baseRepoPath = randomBaseRepoPath();

const gitFilePath = path.join(".git", "objects", "12345");
const normalFilePath = path.join("abc", "12345.js");
const ignorableFilePath = "ignore.js";

const repoPath = randomRepoPath();
const syncIgnorePath = getSyncIgnoreFilePath(repoPath);
const syncIgnoreData = ".git\n\n\n.skip_repo_1\nignore.js";

beforeAll(() => {
    // Create directories
    fs.mkdirSync(repoPath, { recursive: true });
    // Create directories
    fs.mkdirSync(baseRepoPath, { recursive: true });
});

afterAll(() => {
    fs.rmdirSync(baseRepoPath, { recursive: true });
    fs.rmdirSync(repoPath, { recursive: true });
});

test("shouldIgnoreFile with git file",  () => {
    expect(shouldIgnoreFile(repoPath, gitFilePath)).toBe(true);
});

test("shouldIgnoreFile with normal file and no .syncignore",  () => {
    expect(shouldIgnoreFile(repoPath, normalFilePath)).toBe(true);
});

test("shouldIgnoreFile with normal file and with .syncignore",  () => {
    fs.writeFileSync(syncIgnorePath, syncIgnoreData);
    expect(shouldIgnoreFile(repoPath, normalFilePath)).toBe(false);
    fs.rmSync(syncIgnorePath);
});

test("shouldIgnoreFile with ignorable file",  () => {
    fs.writeFileSync(syncIgnorePath, syncIgnoreData);
    expect(shouldIgnoreFile(repoPath, ignorableFilePath)).toBe(true);
    fs.rmSync(syncIgnorePath);
});

