import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AgreementClient,
  AttachmentClient,
  BooleanResponse,
  ConstructorClient,
  FourthStepDto,
  FullAgreementDto,
  FullAgreementDtoResponse,
  GetAllAgreementDtoListPagedResponseResponse,
  GetAttachmentMetaDataListResponse,
  GetAttachmentMetaDataResponse,
  GetConstructorDto,
  Int32Response,
  LookupClient,
  LookupDto,
  LookupType,
  MileStonesDto,
  StringLookupDtoListDictionaryResponse
} from '../../../../nswag/api-client';
import { getLookupData } from '../../../shared/utils/lookup.util';

@Injectable({
  providedIn: 'root'
})
export class AgreementWizardService {

  constructor(
    private agreementClient: AgreementClient,
    private attachmentClient: AttachmentClient,
    private lookupClient: LookupClient,
    private constructorClient: ConstructorClient
  ) { }

  // Agreement methods
  createAgreement(agreementData: FullAgreementDto): Observable<Int32Response> {
    return this.agreementClient.createAgreement(agreementData);
  }

  getAllAgreements(pageNumber?: number, pageSize?: number): Observable<GetAllAgreementDtoListPagedResponseResponse> {
    return this.agreementClient.getAllAgreements(pageNumber, pageSize);
  }

  getAgreementById(id: number, step?: number): Observable<FullAgreementDtoResponse> {
    return this.agreementClient.getAgreementById(id, step);
  }

  // Attachment methods
  getAttachmentById(id: number): Observable<GetAttachmentMetaDataResponse> {
    return this.attachmentClient.getAttachmentById(id);
  }

  deleteAttachment(id: number): Observable<BooleanResponse> {
    return this.attachmentClient.deleteAttachment(id);
  }

  getAttachmentsByAgreementId(agreementId: number): Observable<GetAttachmentMetaDataListResponse> {
    return this.attachmentClient.getAttachmentsByAgreementId(agreementId, undefined);
  }

  downloadAttachment(id: number): Observable<void> {
    return this.attachmentClient.downloadAttachment(id);
  }

  // Lookup methods
  getAllLookups(lookupTypes?: LookupType[]): Observable<StringLookupDtoListDictionaryResponse> {
    return this.lookupClient.getAllLookups(lookupTypes);
  }

  // Helper methods to get specific lookups
  getCountries(): Observable<LookupDto[]> {
    return this.getAllLookups([LookupType.Country]).pipe(
      map(response => {
        if (response.succeeded) {
          return getLookupData(response.data, LookupType.Country) ?? [];
        }
        return [];
      })
    );
  }

  getCities(): Observable<LookupDto[]> {
    return this.getAllLookups([LookupType.City]).pipe(
      map(response => {
        if (response.succeeded) {
          return getLookupData(response.data, LookupType.City) ?? [];
        }
        return [];
      })
    );
  }

  getAgreementTypes(): Observable<LookupDto[]> {
    return this.getAllLookups([LookupType.AgreementType]).pipe(
      map(response => {
        if (response.succeeded) {
          return getLookupData(response.data, LookupType.AgreementType) ?? [];
        }
        return [];
      })
    );
  }

  // Get all required lookups for step 1 at once
  getStep1Lookups(): Observable<{ countries: LookupDto[], cities: LookupDto[], agreementTypes: LookupDto[] }> {
    return this.getAllLookups([LookupType.Country, LookupType.City, LookupType.AgreementType]).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            countries: getLookupData(response.data, LookupType.Country) ?? [],
            cities: getLookupData(response.data, LookupType.City) ?? [],
            agreementTypes: getLookupData(response.data, LookupType.AgreementType) ?? []
          };
        }
        return { countries: [], cities: [], agreementTypes: [] };
      })
    );
  }

  // Get lookups for Step 2
  getStep2Lookups(): Observable<{
    contractTypes: LookupDto[],
    contractModels: LookupDto[],
    paymentMethods: LookupDto[],
    services: LookupDto[]
  }> {
    return this.getAllLookups([LookupType.ContractType, LookupType.ContractModel, LookupType.PaymentMethod, LookupType.Service]).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            contractTypes: getLookupData(response.data, LookupType.ContractType) ?? [],
            contractModels: getLookupData(response.data, LookupType.ContractModel) ?? [],
            paymentMethods: getLookupData(response.data, LookupType.PaymentMethod) ?? [],
            services: getLookupData(response.data, LookupType.Service) ?? []
          };
        }
        return { contractTypes: [], contractModels: [], paymentMethods: [], services: [] };
      })
    );
  }

  // Get lookups for Step 3
  getStep3Lookups(): Observable<{ units: LookupDto[], annexes: LookupDto[] }> {
    return this.getAllLookups([LookupType.Unit, LookupType.Annex]).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            units: getLookupData(response.data, LookupType.Unit) ?? [],
            annexes: getLookupData(response.data, LookupType.Annex) ?? []
          };
        }
        return { units: [], annexes: [] };
      })
    );
  }

  // Get lookups for Step 4
  getStep4Lookups(): Observable<{
    mainContractTypes: LookupDto[],
    constructors: LookupDto[],
    units: LookupDto[],
    dutyTypes: LookupDto[],
    dutyResponsibilities: LookupDto[],
    milestones: LookupDto[]
  }> {
    return this.getAllLookups([LookupType.MainContractType, LookupType.Constructor, LookupType.Unit, LookupType.DutyType, LookupType.DutyResponsibility, LookupType.MileStones]).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            mainContractTypes: getLookupData(response.data, LookupType.MainContractType) ?? [],
            constructors: getLookupData(response.data, LookupType.Constructor) ?? [],
            units: getLookupData(response.data, LookupType.Unit) ?? [],
            dutyTypes: getLookupData(response.data, LookupType.DutyType) ?? [],
            dutyResponsibilities: getLookupData(response.data, LookupType.DutyResponsibility) ?? [],
            milestones: getLookupData(response.data, LookupType.MileStones) ?? []
          };
        }
        return { mainContractTypes: [], constructors: [], units: [], dutyTypes: [], dutyResponsibilities: [], milestones: [] };
      })
    );
  }

  // Get lookups for Step 5
  getStep5Lookups(): Observable<{ suppliers: LookupDto[] }> {
    return this.getAllLookups([LookupType.Supplier]).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            suppliers: getLookupData(response.data, LookupType.Supplier) ?? []
          };
        }
        return { suppliers: [] };
      })
    );
  }

  // Get lookups for Step 6
  getStep6Lookups(): Observable<{ units: LookupDto[], milestones: LookupDto[], constructors: LookupDto[], suppliers: LookupDto[] }> {
    return this.getAllLookups([LookupType.Unit, LookupType.MileStones, LookupType.Constructor, LookupType.Supplier]).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            units: getLookupData(response.data, LookupType.Unit) ?? [],
            milestones: getLookupData(response.data, LookupType.MileStones) ?? [],
            constructors: getLookupData(response.data, LookupType.Constructor) ?? [],
            suppliers: getLookupData(response.data, LookupType.Supplier) ?? []
          };
        }
        return { units: [], milestones: [], constructors: [], suppliers: [] };
      })
    );
  }

  // Create individual main contract for Step 4
  createMainContract(agreementId: number, mainContractData: any): Observable<Int32Response> {
    const fourthStepDto = new FullAgreementDto();
    fourthStepDto.step = 5;
    fourthStepDto.agreementId = agreementId;
    
    const fourthStep = new FourthStepDto();
    fourthStep.mainContractDto = [mainContractData];
    fourthStepDto.fourthStepDto = fourthStep;
    
    return this.agreementClient.createAgreement(fourthStepDto);
  }

  // Get contractors filtered by main contract type
  getConstructorsByTypeId(typeId: number): Observable<GetConstructorDto[]> {
    return this.constructorClient.getByTypeId(typeId, undefined, undefined, undefined).pipe(
      map(response => {
        if (response.succeeded && response.data?.data) {
          return response.data.data;
        }
        return [];
      })
    );
  }

  // Get milestones from a specific step of an agreement (defaults to step 3)
  getMilestonesFromStep3(agreementId: number, step: number = 3): Observable<MileStonesDto[]> {
    return this.agreementClient.getAgreementById(agreementId, step).pipe(
      map(response => {
        if (response.succeeded && response.data?.mileStonesStepDto?.mileStonesDto) {
          return response.data.mileStonesStepDto.mileStonesDto.filter(m => !m.isDeleted);
        }
        return [];
      })
    );
  }
}
