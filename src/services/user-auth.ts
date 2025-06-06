import {
    SRC_Rev_REF,
    OdmdCrossRefProducer,
    OdmdCrossRefConsumer, OdmdEnverUserAuth
} from "@ondemandenv/contracts-lib-base";
import type {RagContracts} from "../rag-contracts";
import {IOdmdEnver} from "@ondemandenv/contracts-lib-base/lib/model/odmd-enver";
import {OdmdBuildUserAuth} from "@ondemandenv/contracts-lib-base/lib/repos/__user-auth/odmd-build-user-auth";

export class RagUserAuthBuild extends OdmdBuildUserAuth {
    public get envers(): RagUserAuthEnver[] {
        return this._envers as RagUserAuthEnver[];
    }

    protected initializeEnvers(): void {
        this._envers = [
            new RagUserAuthEnver(this, this.contracts.accounts.workspace1, 'us-east-2',
                new SRC_Rev_REF('b', 'odmd-rag'))
        ];
    }

    get contracts() {
        return this.node.scope as RagContracts;
    }
}

export class RagUserAuthEnver extends OdmdEnverUserAuth {
    readonly owner: RagUserAuthBuild;

    // Additional RAG-specific auth producers (beyond the base idProviderName and idProviderClientId)
    readonly idProviderClientSecret: OdmdCrossRefProducer<RagUserAuthEnver>;

    // User Pool Configuration
    readonly userPoolId: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly userPoolClientId: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly userPoolDomain: OdmdCrossRefProducer<RagUserAuthEnver>;

    // JWT and Token Management
    readonly jwtSecretKey: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly tokenValidationEndpoint: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly refreshTokenEndpoint: OdmdCrossRefProducer<RagUserAuthEnver>;

    // Authentication Endpoints
    readonly loginUrl: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly logoutUrl: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly signupUrl: OdmdCrossRefProducer<RagUserAuthEnver>;

    // User Management API
    readonly userManagementApi: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly userProfileApi: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly userPreferencesApi: OdmdCrossRefProducer<RagUserAuthEnver>;

    // Role and Permission Management
    readonly rolesManagementApi: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly permissionsApi: OdmdCrossRefProducer<RagUserAuthEnver>;

    // Session Management
    readonly sessionManagementApi: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly sessionValidationApi: OdmdCrossRefProducer<RagUserAuthEnver>;

    // Multi-factor Authentication
    readonly mfaSetupApi: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly mfaValidationApi: OdmdCrossRefProducer<RagUserAuthEnver>;

    // Audit and Monitoring
    readonly authAuditApi: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly authMetricsApi: OdmdCrossRefProducer<RagUserAuthEnver>;

    // OAuth/OIDC Integration
    readonly oauthAuthorizationEndpoint: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly oauthTokenEndpoint: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly oidcDiscoveryEndpoint: OdmdCrossRefProducer<RagUserAuthEnver>;
    readonly jwksEndpoint: OdmdCrossRefProducer<RagUserAuthEnver>;

    // RAG-specific consuming services - callbacks for authenticated services
    readonly ragServiceCallbacks: OdmdCrossRefConsumer<this, IOdmdEnver>[] = [];
    readonly ragLogoutCallbacks: OdmdCrossRefConsumer<this, IOdmdEnver>[] = [];

    constructor(owner: RagUserAuthBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.owner = owner;

        // Initialize RAG-specific cross-refs (base class already handles idProviderName and idProviderClientId)
        this.idProviderClientSecret = new OdmdCrossRefProducer(this, 'id-provider-client-secret');

        // Initialize user pool
        this.userPoolId = new OdmdCrossRefProducer(this, 'user-pool-id');
        this.userPoolClientId = new OdmdCrossRefProducer(this, 'user-pool-client-id');
        this.userPoolDomain = new OdmdCrossRefProducer(this, 'user-pool-domain');

        // Initialize JWT and tokens
        this.jwtSecretKey = new OdmdCrossRefProducer(this, 'jwt-secret-key');
        this.tokenValidationEndpoint = new OdmdCrossRefProducer(this, 'token-validation-endpoint');
        this.refreshTokenEndpoint = new OdmdCrossRefProducer(this, 'refresh-token-endpoint');

        // Initialize authentication endpoints
        this.loginUrl = new OdmdCrossRefProducer(this, 'login-url');
        this.logoutUrl = new OdmdCrossRefProducer(this, 'logout-url');
        this.signupUrl = new OdmdCrossRefProducer(this, 'signup-url');

        // Initialize user management APIs
        this.userManagementApi = new OdmdCrossRefProducer(this, 'user-management-api');
        this.userProfileApi = new OdmdCrossRefProducer(this, 'user-profile-api');
        this.userPreferencesApi = new OdmdCrossRefProducer(this, 'user-preferences-api');

        // Initialize role and permission management
        this.rolesManagementApi = new OdmdCrossRefProducer(this, 'roles-management-api');
        this.permissionsApi = new OdmdCrossRefProducer(this, 'permissions-api');

        // Initialize session management
        this.sessionManagementApi = new OdmdCrossRefProducer(this, 'session-management-api');
        this.sessionValidationApi = new OdmdCrossRefProducer(this, 'session-validation-api');

        // Initialize MFA
        this.mfaSetupApi = new OdmdCrossRefProducer(this, 'mfa-setup-api');
        this.mfaValidationApi = new OdmdCrossRefProducer(this, 'mfa-validation-api');

        // Initialize audit and monitoring
        this.authAuditApi = new OdmdCrossRefProducer(this, 'auth-audit-api');
        this.authMetricsApi = new OdmdCrossRefProducer(this, 'auth-metrics-api');

        // Initialize OAuth/OIDC
        this.oauthAuthorizationEndpoint = new OdmdCrossRefProducer(this, 'oauth-authorization-endpoint');
        this.oauthTokenEndpoint = new OdmdCrossRefProducer(this, 'oauth-token-endpoint');
        this.oidcDiscoveryEndpoint = new OdmdCrossRefProducer(this, 'oidc-discovery-endpoint');
        this.jwksEndpoint = new OdmdCrossRefProducer(this, 'jwks-endpoint');
    }

    wireConsuming() {
        // Wire consuming from other RAG services that need authentication
        // Each service enver produces callback/logout URLs, and this single user-auth enver consumes them

        // Get contracts reference
        const ragContracts = this.owner.contracts as RagContracts;

        // Wire callbacks from document ingestion service (dev and prod envers)
        ragContracts.ragDocumentIngestionBuild.envers.forEach((e, index) => {
            this.ragServiceCallbacks.push(new OdmdCrossRefConsumer(this, `doc-ing-callback-${index}`, e.authCallbackUrl));
            this.ragLogoutCallbacks.push(new OdmdCrossRefConsumer(this, `doc-ing-logout-${index}`, e.logoutUrl));
        });

        // Note: Knowledge retrieval and generation services will be added when they implement callback/logout URLs
    }

    getRevStackNames(): Array<string> {
        const name = super.getRevStackNames()[0];
        return [name, name + '-web-hosting', name + '-web-ui'];
    }
} 