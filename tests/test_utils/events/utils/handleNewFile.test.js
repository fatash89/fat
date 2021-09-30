import fs from "fs";
import path from "path";
import untildify from "untildify";

import {readYML} from "../../../../lib/utils/common";
import {handleNewFile} from "../../../../lib/events/utils";
import {DEFAULT_BRANCH, DIFF_SOURCE} from "../../../../lib/constants";
import {
    getSyncIgnoreFilePath,
    mkDir,
    randomBaseRepoPath,
    randomRepoPath,
    rmDir,
    writeFile
} from "../../../helpers/helpers";
import {pathUtils} from "../../../../lib/utils/path_utils";

describe("handleNewFile",  () => {
    const repoPath = randomRepoPath();
    const baseRepoPath = randomBaseRepoPath();

    untildify.mockReturnValue(baseRepoPath);

    const pathUtilsObj = new pathUtils(repoPath, DEFAULT_BRANCH);
    const diffsRepo = pathUtilsObj.getDiffsRepo();
    const shadowRepoBranchPath = pathUtilsObj.getShadowRepoBranchPath();
    const originalsRepoBranchPath = pathUtilsObj.getOriginalsRepoBranchPath();

    const newFilePath = path.join(repoPath, "new.js");
    const newDirectoryPath = path.join(repoPath, "new");
    const syncIgnorePath = getSyncIgnoreFilePath(repoPath);
    const shadowFilePath = path.join(shadowRepoBranchPath, "new.js");
    const originalsFilePath = path.join(originalsRepoBranchPath, "new.js");
    const syncIgnoreData = ".git\n\n\n.skip_repo_1\nignore.js";
    const ignorableFilePath = path.join(repoPath, "ignore.js");

    beforeEach(() => {
        jest.clearAllMocks();
        untildify.mockReturnValue(baseRepoPath);
        // Create directories
        mkDir(repoPath);
        mkDir(diffsRepo);
        mkDir(originalsRepoBranchPath);
        mkDir(shadowRepoBranchPath);
        writeFile(newFilePath, "use babel;");
        writeFile(ignorableFilePath, "use babel;");
        writeFile(syncIgnorePath, syncIgnoreData);
    });

    afterEach(() => {
        rmDir(baseRepoPath);
        rmDir(repoPath);
    });

    test("Valid File",  () => {
        /*
         *
         {
            source: 'vs-code',
            created_at: '2021-08-26 18:59:51.954',
            diff: "",
            repo_path: 'tests/tests_data/test_repo_sNIVUqukDv',
            branch: 'default',
            file_relative_path: 'new.js',
            is_new_file: true
          }
        *
        * */
        handleNewFile(repoPath, DEFAULT_BRANCH, newFilePath);
        // Verify file has been created in the .shadow repo and .originals repos
        expect(fs.existsSync(shadowFilePath)).toBe(true);
        expect(fs.existsSync(originalsFilePath)).toBe(true);
        // Verify correct diff file has been generated
        let diffFiles = fs.readdirSync(diffsRepo);
        expect(diffFiles).toHaveLength(1);
        const diffFilePath = path.join(diffsRepo, diffFiles[0]);
        const diffData = readYML(diffFilePath);
        expect(diffData.source).toEqual(DIFF_SOURCE);
        expect(diffData.is_new_file).toBe(true);
        expect(diffData.is_rename).toBeFalsy();
        expect(diffData.is_deleted).toBeFalsy();
        expect(diffData.repo_path).toEqual(repoPath);
        expect(diffData.branch).toEqual(DEFAULT_BRANCH);
        expect(diffData.file_relative_path).toEqual("new.js");
        expect(diffData.diff).toEqual("");
    });

    test("with syncignored file", () => {
        handleNewFile(repoPath, DEFAULT_BRANCH, ignorableFilePath);
        // Verify file has been created in the .shadow repo and .originals repos
        expect(fs.existsSync(path.join(shadowRepoBranchPath, "ignore.js"))).toBe(false);
        expect(fs.existsSync(path.join(originalsRepoBranchPath, "ignore.js"))).toBe(false);
        // Verify correct diff file has been generated
        let diffFiles = fs.readdirSync(diffsRepo);
        expect(diffFiles).toHaveLength(0);
    });

    test("with shadow file there", () => {
        fs.writeFileSync(shadowFilePath, "use babel;");
        handleNewFile(repoPath, DEFAULT_BRANCH, newFilePath);
        // Verify file has been NOT created in the .originals repos
        expect(fs.existsSync(originalsFilePath)).toBe(false);
        // Verify correct diff file has been generated
        let diffFiles = fs.readdirSync(diffsRepo);
        expect(diffFiles).toHaveLength(0);
    });

    test("with originals file there", () => {
        fs.writeFileSync(originalsFilePath, "use babel;");
        handleNewFile(repoPath, DEFAULT_BRANCH, newFilePath);
        // Verify file has NOT been created in the .shadow repo
        expect(fs.existsSync(shadowFilePath)).toBe(false);
        // Verify correct diff file has been generated
        let diffFiles = fs.readdirSync(diffsRepo);
        expect(diffFiles).toHaveLength(0);
    });


    test("with new directory", () => {
        fs.mkdirSync(newDirectoryPath, { recursive: true });
        handleNewFile(repoPath, DEFAULT_BRANCH, newDirectoryPath);
        // Verify correct diff file has been generated
        let diffFiles = fs.readdirSync(diffsRepo);
        expect(diffFiles).toHaveLength(0);
    });

});
