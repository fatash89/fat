import fs from "fs";
import yaml from "js-yaml";
import {repoIsNotSynced} from "../../../../lib/events/utils";
import {getConfigFilePath, randomBaseRepoPath, randomRepoPath} from "../../../helpers/helpers";
import untildify from "untildify";


describe("repoIsNotSynced", () => {
    const baseRepoPath = randomBaseRepoPath();
    const configPath = getConfigFilePath(baseRepoPath);

    const repoPath = randomRepoPath();

    beforeEach(() => {
        // Create directories
        fs.mkdirSync(repoPath, {recursive: true});
        // Create directories
        fs.mkdirSync(baseRepoPath, {recursive: true});
        jest.clearAllMocks();
        untildify.mockReturnValue(baseRepoPath);
    });

    afterEach(() => {
        fs.rmdirSync(baseRepoPath, {recursive: true});
        fs.rmSync(repoPath, { recursive: true, force: true });
    });

    test("with no config.yml", () => {
        expect(repoIsNotSynced(repoPath)).toBe(true);
    });

    test("with default config.yml", () => {
        expect(repoIsNotSynced(repoPath)).toBe(true);
    });

    test("with repo not in config.yml", () => {
        fs.writeFileSync(configPath, yaml.safeDump({'repos': {}}));
        expect(repoIsNotSynced(repoPath)).toBe(true);
        fs.rmSync(configPath);
    });

    test("with repo in config.yml", () => {
        const config = {'repos': {}};
        config.repos[repoPath] = {'branches': {}};
        fs.writeFileSync(configPath, yaml.safeDump(config));
        expect(repoIsNotSynced(repoPath)).toBe(false);
        fs.rmSync(configPath);
    });

    test("repoIsNotSynced with invalid config.yml", () => {
        fs.writeFileSync(configPath, "");
        expect(repoIsNotSynced(repoPath)).toBe(true);
        fs.rmSync(configPath);
    });
});
