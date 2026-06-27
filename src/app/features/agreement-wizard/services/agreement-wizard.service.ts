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
  GetMaterialDtoListPagedResponseResponse,
  Int32Response,
  LookupClient,
  LookupDto,
  MaterialClient,
  MileStonesDto,
  StringLookupDtoListDictionaryResponse
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class AgreementWizardService {

  constructor(
    private agreementClient: AgreementClient,
    private attachmentClient: AttachmentClient,
    private lookupClient: LookupClient,
    private constructorClient: ConstructorClient,
    private materialClient: MaterialClient
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
  getAllLookups(lookupTypes?: string[]): Observable<StringLookupDtoListDictionaryResponse> {
    return this.lookupClient.getAllLookups(lookupTypes);
  }

  // Helper methods to get specific lookups
  getCountries(): Observable<LookupDto[]> {
    return this.getAllLookups(['country']).pipe(
      map(response => {
        if (response.succeeded && response.data && response.data['country']) {
          return response.data['country'];
        }
        return [];
      })
    );
  }

  getCities(): Observable<LookupDto[]> {
    return this.getAllLookups(['city']).pipe(
      map(response => {
        if (response.succeeded && response.data && response.data['city']) {
          return response.data['city'];
        }
        return [];
      })
    );
  }

  getAgreementTypes(): Observable<LookupDto[]> {
    return this.getAllLookups(['agreementtype']).pipe(
      map(response => {
        if (response.succeeded && response.data && response.data['agreementtype']) {
          return response.data['agreementtype'];
        }
        return [];
      })
    );
  }

  // Get all required lookups for step 1 at once
  getStep1Lookups(): Observable<{ countries: LookupDto[], cities: LookupDto[], agreementTypes: LookupDto[] }> {
    return this.getAllLookups(['country', 'city', 'agreementtype']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            countries: response.data['country'] || [],
            cities: response.data['city'] || [],
            agreementTypes: response.data['agreementtype'] || []
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
    return this.getAllLookups(['contracttype', 'contractmodel', 'paymentmethod', 'service']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            contractTypes: response.data['contracttype'] || [],
            contractModels: response.data['contractmodel'] || [],
            paymentMethods: response.data['paymentmethod'] || [],
            services: response.data['service'] || []
          };
        }
        return { contractTypes: [], contractModels: [], paymentMethods: [], services: [] };
      })
    );
  }

  // Get lookups for Step 3
  getStep3Lookups(): Observable<{ units: LookupDto[], annexes: LookupDto[] }> {
    return this.getAllLookups(['unit', 'annex']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            units: response.data['unit'] || [],
            annexes: response.data['annex'] || []
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
    return this.getAllLookups(['maincontracttype', 'constructor', 'unit', 'dutytype', 'dutyresponsibility', 'milestones']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            mainContractTypes: response.data['maincontracttype'] || [],
            constructors: response.data['constructor'] || [],
            units: response.data['unit'] || [],
            dutyTypes: response.data['dutytype'] || [],
            dutyResponsibilities: response.data['dutyresponsibility'] || [],
            milestones: response.data['milestones'] || []
          };
        }
        return { mainContractTypes: [], constructors: [], units: [], dutyTypes: [], dutyResponsibilities: [], milestones: [] };
      })
    );
  }

  // Get lookups for Step 5
  getStep5Lookups(): Observable<{ materials: LookupDto[], suppliers: LookupDto[] }> {
    return this.getAllLookups(['material', 'supplier']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            materials: response.data['material'] || [],
            suppliers: response.data['supplier'] || []
          };
        }
        return { materials: [], suppliers: [] };
      })
    );
  }

  // Get lookups for Step 6
  getStep6Lookups(): Observable<{ units: LookupDto[], milestones: LookupDto[], constructors: LookupDto[], suppliers: LookupDto[] }> {
    return this.getAllLookups(['unit', 'milestones', 'constructor', 'supplier']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            units: response.data['unit'] || [],
            milestones: response.data['milestones'] || [],
            constructors: response.data['constructor'] || [],
            suppliers: response.data['supplier'] || []
          };
        }
        return { units: [], milestones: [], constructors: [], suppliers: [] };
      })
    );
  }

  getStep6Materials(
    pageNumber = 1,
    pageSize = 100,
    filter?: string,
    name?: string
  ): Observable<GetMaterialDtoListPagedResponseResponse> {
    return this.materialClient.getAll(pageNumber, pageSize, filter, name);
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
