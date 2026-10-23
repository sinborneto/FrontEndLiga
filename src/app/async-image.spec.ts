import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AsyncImage } from './async-image';
@Component({ imports: [AsyncImage], template: '<span><img appAsyncImage alt="Teste"></span>' })
class ImageHost {}
it('mantém o placeholder até a decodificação concluir sem alterar o espaço da imagem', async () => {
  await TestBed.configureTestingModule({ imports: [ImageHost] }).compileComponents();
  const fixture = TestBed.createComponent(ImageHost);
  fixture.detectChanges();
  const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
  let complete!: () => void;
  Object.defineProperty(image, 'decode', {
    value: () => new Promise<void>((resolve) => (complete = resolve)),
  });
  image.dispatchEvent(new Event('load'));
  fixture.detectChanges();
  expect(image.classList.contains('async-image-pending')).toBe(true);
  complete();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(image.classList.contains('async-image-pending')).toBe(false);
  expect(image.parentElement!.classList.contains('image-loading')).toBe(false);
});
