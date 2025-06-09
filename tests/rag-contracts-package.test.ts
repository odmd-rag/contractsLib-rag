import { App } from 'aws-cdk-lib';
import { RagContracts } from '../src';
import * as packageJson from '../package.json';

describe('RagContracts Package Consistency', () => {
    // Setup environment variables and create instance
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    
    const app = new App();
    const ragContracts = new RagContracts(app);

    test('should have packageName and pkgOrg consistent with package.json', () => {
        const buildContracts = ragContracts.contractsLibBuild;
        
        // Extract package name and organization from package.json
        const expectedPackageName = packageJson.name;
        const expectedPkgOrg = packageJson.name.split('/')[0];
        
        // Check that OdmdBuildContractsLib instance matches package.json
        expect(buildContracts.packageName).toBe(expectedPackageName);
        expect(buildContracts.pkgOrg).toBe(expectedPkgOrg);
    });

    test('should have correct package metadata', () => {
        expect(packageJson.name).toBe('@odmd-rag/contracts-lib-rag');
        expect(packageJson.description).toContain('RAG System Contracts Library');
        expect(packageJson.main).toBe('dist/index.js');
        expect(packageJson.types).toBe('dist/index.d.ts');
    });

    test('should have required dependencies for OndemandEnv platform', () => {
        const dependencies = packageJson.dependencies;
        const devDependencies = packageJson.devDependencies;
        
        // Check CDK dependencies
        expect(dependencies['aws-cdk-lib']).toBeDefined();
        expect(dependencies['constructs']).toBeDefined();
        
        // Check OndemandEnv dependencies
        expect(dependencies['@ondemandenv/contracts-lib-base']).toBeDefined();
        
        // Check TypeScript dependencies
        expect(devDependencies['typescript']).toBeDefined();
        expect(devDependencies['@types/node']).toBeDefined();
    });

    test('should have correct build and test scripts', () => {
        const scripts = packageJson.scripts;
        
        expect(scripts.build).toBe('tsc');
        expect(scripts.clean).toBe('rimraf dist/');
        expect(scripts['test:isolated']).toBeDefined();
        expect(scripts['test:singleton']).toBeDefined();
        expect(scripts['test:structure']).toBeDefined();
        expect(scripts['test:schemas']).toBeDefined();
        expect(scripts['test:dependencies']).toBeDefined();
        expect(scripts['test:package']).toBeDefined();
    });
}); 