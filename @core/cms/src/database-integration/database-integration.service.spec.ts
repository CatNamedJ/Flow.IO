import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseIntegrationService } from "./database-integration.service";
import { Repository } from "typeorm";
import { Credential } from "./entities/credential.entity";
import { getRepositoryToken } from "@nestjs/typeorm";

describe("DatabaseIntegrationService", () => {
  let service: DatabaseIntegrationService;
  let mockCredentialRepository: Partial<Repository<Credential>>;

  beforeEach(async () => {
    mockCredentialRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockImplementation((credential) =>
          Promise.resolve({ id: 1, ...credential })
        ),
      delete: jest
        .fn()
        .mockImplementation((id) => Promise.resolve({ affected: 1 })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseIntegrationService,
        {
          provide: getRepositoryToken(Credential),
          useValue: mockCredentialRepository,
        },
      ],
    }).compile();

    service = module.get<DatabaseIntegrationService>(
      DatabaseIntegrationService
    );
  });

  it("should create a new credential", async () => {
    const createCredentialDto = {
      userId: 1,
      serviceName: "Google",
      credentialType: "OAuth2",
      data: { token: "abc" },
    };

    const result = await service.createCredential(createCredentialDto);

    expect(mockCredentialRepository.create).toHaveBeenCalledWith(
      createCredentialDto
    );
    expect(mockCredentialRepository.save).toHaveBeenCalledWith(
      createCredentialDto
    );
    expect(result).toEqual({ id: 1, ...createCredentialDto });
  });

  it("should delete an existing credential", async () => {
    const credentialId = 1;

    await service.deleteCredential(credentialId);

    expect(mockCredentialRepository.delete).toHaveBeenCalledWith(credentialId);
  });
});
